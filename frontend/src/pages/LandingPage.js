import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiClipboard, FiUsers } from 'react-icons/fi';
import logo from '../assets/logo.svg';
import HistoryControls from '../components/common/HistoryControls';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-leading">
          <HistoryControls />
          <Link className="landing-brand" to="/">
            <img src={logo} alt="ProReview logo" />
            <span><strong>PRO</strong>REVIEW</span>
          </Link>
        </div>
        <div className="landing-nav-actions">
          <Link className="landing-sign-in" to="/login">Sign in</Link>
          <Link className="btn btn-primary landing-nav-cta" to="/register-teacher">
            Get started <FiArrowRight />
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker"><span /> PROJECT REVIEW MANAGEMENT</p>
            <h1>Make every review <em>count.</em></h1>
            <p className="landing-lede">
              A clear, collaborative workspace for teachers to assign project reviews,
              collect submissions, and give students feedback they can act on.
            </p>
            <div className="landing-hero-actions">
              <Link className="btn btn-primary landing-main-cta" to="/register-teacher">
                Start as a teacher <FiArrowRight />
              </Link>
              <Link className="landing-student-link" to="/register-student">
                Join as a student
              </Link>
            </div>
            <div className="landing-trust-row">
              <span><FiCheckCircle /> Assign with clarity</span>
              <span><FiCheckCircle /> Track every submission</span>
            </div>
          </div>

          <div className="landing-hero-visual" aria-label="Project review workflow preview">
            <div className="landing-orbit orbit-one" />
            <div className="landing-orbit orbit-two" />
            <div className="landing-preview-card">
              <div className="preview-topline"><span>CLASS OVERVIEW</span><b>Spring 2026</b></div>
              <div className="preview-heading">Project review pulse</div>
              <div className="preview-metrics">
                <div><strong>24</strong><span>Students</span></div>
                <div><strong>18</strong><span>Submitted</span></div>
                <div><strong>92%</strong><span>Progress</span></div>
              </div>
              <div className="preview-progress"><span style={{ width: '74%' }} /></div>
              <div className="preview-task"><span className="preview-icon"><FiClipboard /></span><span><b>Research proposal</b><small>12 reviews completed</small></span><strong>74%</strong></div>
              <div className="preview-task"><span className="preview-icon green"><FiUsers /></span><span><b>Design system audit</b><small>6 reviews completed</small></span><strong>50%</strong></div>
            </div>
            <div className="landing-note"><FiCheckCircle /><span><b>Feedback loop closed</b><small>Students can see their marks</small></span></div>
          </div>
        </section>

        <section className="landing-benefits" aria-label="ProReview benefits">
          <div><span className="benefit-number">01</span><h2>One place for the whole review cycle</h2></div>
          <p>From the first assignment to the final mark, keep project work moving with less chasing and more useful feedback.</p>
          <div className="benefit-line" />
          <div className="benefit-stats"><strong>Built for</strong><span>Teachers who lead. Students who grow.</span></div>
        </section>
      </main>
    </div>
  );
}