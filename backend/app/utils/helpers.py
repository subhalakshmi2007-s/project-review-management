import random
import string


def make_join_code(length=8):
    """Generate an uppercase alphanumeric join code, e.g. 'ABC12345'."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


def allowed_pdf(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'
