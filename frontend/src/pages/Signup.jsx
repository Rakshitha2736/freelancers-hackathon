import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup as signupAPI } from '../services/api';

const Signup = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const getPasswordStrength = (password) => {
    if (!password) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { label: 'Weak', color: '#dc2626', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: '#ea580c', width: '40%' };
    if (score <= 3) return { label: 'Good', color: '#ca8a04', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: '#16a34a', width: '80%' };
    return { label: 'Very Strong', color: '#15803d', width: '100%' };
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required.';
        if (value.trim().length < 3) return 'Name must be at least 3 characters.';
        if (value.trim().length > 50) return 'Name must be under 50 characters.';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required.';
        if (!emailRegex.test(value)) return 'Enter a valid email address.';
        return '';
      case 'password':
        if (!value) return 'Password is required.';
        if (value.length < 6) return 'Password must be at least 6 characters.';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password.';
        if (value !== form.password) return 'Passwords do not match.';
        return '';
      default:
        return '';
    }
  };

  const validateAll = () => {
    const errs = {};
    Object.keys(form).forEach((key) => {
      const msg = validateField(key, form[key]);
      if (msg) errs[key] = msg;
    });
    return errs;
  };

  const isFormValid = () => {
    return (
      form.name.trim().length >= 3 &&
      emailRegex.test(form.email) &&
      form.password.length >= 6 &&
      form.confirmPassword === form.password &&
      form.confirmPassword.length > 0
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Real-time validation for touched fields
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }

    // Re-validate confirmPassword when password changes
    if (name === 'password' && touched.confirmPassword && form.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: value !== form.confirmPassword ? 'Passwords do not match.' : '',
      }));
    }

    if (serverError) setServerError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    // Mark all touched
    const allTouched = {};
    Object.keys(form).forEach((k) => (allTouched[k] = true));
    setTouched(allTouched);

    const errs = validateAll();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await signupAPI({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      
      // With cookie-based auth, token is in HttpOnly cookie, not in response
      // User data is in res.data.user
      const userData = res.data.user;
      
      // Store user in auth context (token is automatically handled via cookies)
      login(null, userData);
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || !err.response) {
        setServerError('Unable to connect to server. Please check your connection.');
      } else if (err.response?.status === 409) {
        setServerError('This email is already registered. Try signing in instead.');
      } else if (err.response?.status === 422 || err.response?.status === 400) {
        // Handle field-level validation errors from backend
        const data = err.response?.data;
        if (data?.errors && typeof data.errors === 'object') {
          setErrors((prev) => ({ ...prev, ...data.errors }));
        } else {
          setServerError(data?.message || 'Invalid input. Please check your details.');
        }
      } else if (err.response?.status === 429) {
        setServerError('Too many requests. Please try again later.');
      } else {
        setServerError(err.response?.data?.message || 'Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(form.password);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <defs>
              <linearGradient id="signupGrad" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
            <rect width="40" height="40" rx="10" fill="url(#signupGrad)"/>
            <path d="M12 20l5 5 11-11" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>MeetingAI</span>
        </div>
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Start summarizing meetings with AI</p>
        </div>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="name"
              className={touched.name && errors.name ? 'input-error' : ''}
            />
            {touched.name && errors.name && (
              <span className="field-error">{errors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="email"
              className={touched.email && errors.email ? 'input-error' : ''}
            />
            {touched.email && errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              className={touched.password && errors.password ? 'input-error' : ''}
            />
            {touched.password && errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
            {form.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{ width: passwordStrength.width, backgroundColor: passwordStrength.color }}
                  />
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              className={touched.confirmPassword && errors.confirmPassword ? 'input-error' : ''}
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-auth"
            disabled={loading || !isFormValid()}
          >
            {loading ? (
              <><span className="spinner-sm" /> Creating account...</>
            ) : (
              <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="7" r="4" stroke="currentColor"/><line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round"/></svg> Sign Up</>
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
