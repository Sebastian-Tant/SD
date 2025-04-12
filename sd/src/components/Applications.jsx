import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import './css-files/Applications.css';

const Applications = () => {
  const [formData, setFormData] = useState({
    name: '',
    applicationType: '',
    Facility: '',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      await addDoc(collection(db, 'applications'), {
        ...formData,
        status: 'pending'
      });
      
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        applicationType: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="applications" className="applications-section">
      <h1 className="applications-title">Want to be an Admin or Facility Staff member?</h1>
      <article className="applications-container">
        <h2 className="applications-title2">Application Form</h2>
        
        {submitSuccess ? (
          <section className="success-message">
            <p>Your application has been submitted successfully!</p>
            <button onClick={() => setSubmitSuccess(false)} className="submit-btn">
              Submit Another Application
            </button>
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="application-form">
            <section className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </section>
            
            <section className="form-group">
              <label htmlFor="phone">Facility</label>
              <select
                type="tel"
                id="Facility"
                name="Facility"
                value={formData.Facility}
                onChange={handleChange}
                required
              >
                <option value="">Select an option</option>
                <option value="Gym">Gym</option>
                <option value="Football">Football Field</option>
                <option value="Pool">Swimming Pool</option>
                </select>
            </section>
            
            <section className="form-group">
              <label htmlFor="applicationType">Position</label>
              <select
                id="applicationType"
                name="applicationType"
                value={formData.applicationType}
                onChange={handleChange}
                required
              >
                <option value="">Select an option</option>
                <option value="Facility Staff">Facility Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </section>
            
            <section className="form-group">
              <label htmlFor="message">Why should we choose you?</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="5"
              />
            </section>
            
            <button 
              type="submit" 
              className="submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
            
            {submitError && (
              <p className="error-message">{submitError}</p>
            )}
          </form>
        )}
      </article>
    </section>
  );
};

export default Applications;