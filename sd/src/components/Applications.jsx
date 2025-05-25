import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import './css-files/Applications.css';

const Applications = () => {
  const [formData, setFormData] = useState({
    name: '',
    applicationType: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const validateForm = (data) => {
    const newErrors = {};

    // Name validation
    if (!data.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z\\s]+$/.test(data.name)) {
      newErrors.name = 'Name must contain only letters and spaces';
    } else if (data.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (data.name.length > 50) {
      newErrors.name = 'Name must not exceed 50 characters';
    }

    // Application Type validation
    if (!data.applicationType) {
      newErrors.applicationType = 'Please select a position';
    } else if (!['Facility Staff', 'Admin'].includes(data.applicationType)) {
      newErrors.applicationType = 'Invalid position selected';
    }

    // Message validation (optional field)
    if (data.message && data.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    } else if (data.message.length > 500) {
      newErrors.message = 'Message must not exceed 500 characters';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    const updatedData = { ...formData, [name]: value };
    const newErrors = validateForm(updatedData);
    setErrors(prev => ({
      ...prev,
      [name]: newErrors[name] || null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in to submit an application.");

      await addDoc(collection(db, 'applications'), {
        ...formData,
        uid: user.uid,
        status: 'pending',
        submittedAt: new Date()
      });

      setSubmitSuccess(true);
      setFormData({
        name: '',
        applicationType: '',
        message: ''
      });
      setErrors({});
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
                className={errors.name ? 'input-error' : ''}
              />
              {errors.name && <p className="error-message">{errors.name}</p>}
            </section>

            <section className="form-group">
              <label htmlFor="applicationType">Position</label>
              <select
                id="applicationType"
                name="applicationType"
                value={formData.applicationType}
                onChange={handleChange}
                required
                className={errors.applicationType ? 'input-error' : ''}
              >
                <option value="">Select an option</option>
                <option value="Facility Staff">Facility Staff</option>
                <option value="Admin">Admin</option>
              </select>
              {errors.applicationType && <p className="error-message">{errors.applicationType}</p>}
            </section>

            <section className="form-group">
              <label htmlFor="message">Why should we choose you?</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="5"
                className={errors.message ? 'input-error' : ''}
              />
              {errors.message && <p className="error-message">{errors.message}</p>}
            </section>

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || Object.keys(errors).some(key => errors[key])}
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
