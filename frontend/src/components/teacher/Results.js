import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiBarChart2, FiSearch, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function Results({ endpoint = '/marks/summary' }) {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSummaries, setStudentSummaries] = useState({});
  const [searchText, setSearchText] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(endpoint);
      setRows(Array.isArray(data) ? data : data.reviews || []);
      setStudents(Array.isArray(data) ? [] : data.students || []);
      setStudentSummaries({});
    } catch {
      toast.error('Failed to load results');
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const studentGroups = useMemo(() => {
    const groups = rows.reduce((result, row) => {
      const studentId = row.student_id;
      if (!result[studentId]) result[studentId] = { name: row.student_name, rows: [] };
      result[studentId].rows.push(row);
      return result;
    }, {});
    students.forEach((student) => {
      if (!groups[student.id]) groups[student.id] = { name: student.name, rows: [] };
    });
    return groups;
  }, [rows, students]);

  const calculateStudentSummary = (studentId) => {
    const markedRows = studentGroups[studentId].rows.filter(
      (row) => row.marks_obtained !== null && row.marks_obtained !== undefined,
    );
    const totalReviewMarks = markedRows.reduce((sum, row) => sum + Number(row.total_marks || 0), 0);
    const totalObtainedMarks = markedRows.reduce((sum, row) => sum + Number(row.marks_obtained || 0), 0);
    const average = totalReviewMarks > 0 ? (totalObtainedMarks / totalReviewMarks) * 100 : 0;
    setStudentSummaries((current) => ({
      ...current,
      [studentId]: {
        reviewCount: studentGroups[studentId].rows.length,
        totalReviewMarks,
        totalObtainedMarks,
        average,
      },
    }));
  };

  const filteredGroups = Object.entries(studentGroups).filter(([, group]) => (
    !searchText.trim() || group.name.toLowerCase().includes(searchText.trim().toLowerCase())
  ));

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiBarChart2 style={{ marginRight: 6, color: 'var(--navy)' }} />Results</h3>
      </div>

      {Object.entries(studentGroups).length === 0
        ? <div className="alert alert-info">No member results available yet.</div>
        : <>
          <div style={{
            display: 'flex', gap: '.75rem', alignItems: 'center',
            marginBottom: '1rem', background: 'var(--light-navy)',
            borderRadius: 10, padding: '.75rem 1rem',
          }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <FiSearch style={{
                position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: '#64748b', fontSize: '.9rem',
              }} />
              <input
                className="form-control"
                style={{ paddingLeft: 32, height: 38 }}
                type="text"
                placeholder="Search member by name…"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>
            {searchText && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchText('')}
                title="Clear student search"
                style={{ height: 38, whiteSpace: 'nowrap' }}
              >
                <FiX /> Clear
              </button>
            )}
          </div>

          {filteredGroups.length === 0
            ? <div className="alert alert-info">No members match your search.</div>
            : filteredGroups.map(([studentId, group]) => {
            const studentSummary = studentSummaries[studentId];

            return (
              <div key={studentId} className="panel" style={{ marginBottom: '1rem', background: 'var(--light-navy)' }}>
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong style={{ marginRight: 'auto' }}>{group.name}</strong>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => calculateStudentSummary(studentId)}
                  >
                    <FiBarChart2 /> Calculate Results
                  </button>
                </div>
                {studentSummary && (
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: 10 }}>
                    <span><strong>Number of Reviews:</strong> {studentSummary.reviewCount}</span>
                    <span><strong>Total Review Marks:</strong> {studentSummary.totalReviewMarks}</span>
                    <span><strong>Total Marks Obtained:</strong> {studentSummary.totalObtainedMarks}</span>
                    <span><strong>Average:</strong> {studentSummary.average.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            );
            })}
        </>}
    </>
  );
}
