from app import create_app
from app.extensions import db
from app.models import User
import io

app = create_app()
with app.app_context():
    db.drop_all()
    db.create_all()
    client = app.test_client()

    teacher_resp = client.post('/api/auth/register-teacher', json={'name': 'Teacher', 'email': 'teacher@example.com', 'password': '123456'})
    print('REGISTER_TEACHER', teacher_resp.status_code, teacher_resp.get_json()['join_code'])
    token_t = teacher_resp.get_json()['token']
    teacher = User.query.filter_by(email='teacher@example.com').first()

    student_resp = client.post('/api/auth/register-student', json={'name': 'Student', 'email': 'student@example.com', 'password': '123456', 'join_code': teacher.join_code})
    print('REGISTER_STUDENT', student_resp.status_code, student_resp.get_json()['user']['id'])
    token_s = student_resp.get_json()['token']
    student_id = User.query.filter_by(email='student@example.com').first().id

    review_resp = client.post('/api/reviews', json={'review_number': 1, 'deadline': '2030-01-15T12:00:00', 'student_id': student_id}, headers={'Authorization': 'Bearer ' + token_t})
    print('CREATE_REVIEW', review_resp.status_code, review_resp.get_json()['message'])
    review_id = review_resp.get_json()['review']['id']

    my_reviews = client.get('/api/reviews/mine', headers={'Authorization': 'Bearer ' + token_s})
    print('MY_REVIEWS', my_reviews.status_code, my_reviews.get_json()[0]['title'], my_reviews.get_json()[0]['description'])

    pdf = io.BytesIO(b'%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')
    submit_resp = client.post(
        f'/api/reviews/{review_id}/submit',
        data={
            'title': 'Project Review',
            'description': 'Built the project and included notes',
            'task_note': 'Completed UI and backend',
            'file': (pdf, 'submission.pdf')
        },
        content_type='multipart/form-data',
        headers={'Authorization': 'Bearer ' + token_s}
    )
    print('SUBMIT', submit_resp.status_code, submit_resp.get_json()['message'])

    mark_resp = client.post(f'/api/marks/{review_id}', json={'marks_obtained': 88.5, 'feedback': 'Strong work'}, headers={'Authorization': 'Bearer ' + token_t})
    print('MARK', mark_resp.status_code, mark_resp.get_json()['message'])

    student_marks = client.get('/api/marks/mine', headers={'Authorization': 'Bearer ' + token_s})
    print('STUDENT_MARKS', student_marks.status_code, student_marks.get_json()[0]['marks_obtained'], student_marks.get_json()[0]['feedback'])

    my_reviews_after = client.get('/api/reviews/mine', headers={'Authorization': 'Bearer ' + token_s})
    print('MY_REVIEWS_AFTER', my_reviews_after.status_code, my_reviews_after.get_json()[0]['title'], my_reviews_after.get_json()[0]['marks_obtained'], my_reviews_after.get_json()[0]['feedback'])
