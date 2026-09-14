import api from './api';
import { openPdfFromApi } from './pdfViewer';

jest.mock('./api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

describe('openPdfFromApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:http://localhost/test.pdf');
  });

  it('fetches the uploaded PDF and opens it in the same tab without creating a new window', async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    api.get.mockResolvedValue({
      data: new Blob(['pdf-data'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });

    await openPdfFromApi('student_report.pdf');

    expect(api.get).toHaveBeenCalledWith('/reviews/uploads/student_report.pdf', expect.objectContaining({
      responseType: 'blob',
    }));
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(window.location.href).toBe('blob:http://localhost/test.pdf');

    window.location = originalLocation;
  });
});
