import api from './api';

const normalizeBaseUrl = (baseUrl) => baseUrl?.replace(/\/$/, '') || '';

export const buildPdfDownloadUrl = (filename) => {
  if (!filename) return '';
  const baseUrl = normalizeBaseUrl(api.defaults.baseURL);
  return `${baseUrl}/reviews/uploads/${encodeURIComponent(filename)}`;
};

export const openPdfFromApi = async (filename) => {
  if (!filename) return;

  try {
    const { data } = await api.get(`/reviews/uploads/${encodeURIComponent(filename)}`, {
      responseType: 'blob',
    });

    const pdfUrl = URL.createObjectURL(data);
    window.location.href = pdfUrl;
  } catch (error) {
    alert('Unable to display the PDF. Please try again.');
  }
};
