// src/components/ContactForm.js
import React, { useState } from 'react';
import { submitOrder } from '../services/api'; // Import the API function
import './ContactForm.css';

function ContactForm() {
  const reasonOptions = ['Inquiry', 'Order Issue', 'Feedback', 'Other'];
  const productOptions = ['Product A', 'Product B', 'Product C'];
  const referralOptions = ['Google', 'Facebook', 'Instagram', 'Other'];

  const [formData, setFormData] = useState({
    reason: '',
    product: '',
    freeSample: false,
    firstName: '',
    surname: '',
    organisation: '',
    position: '',
    artPacks: '',
    referral: '',
    email: '',
    confirmEmail: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postcode: '',
    deliveryInstructions: '',
    agreeToPromotions: false,
  });

  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await submitOrder(formData); // Use the API function
      setMessage('Form submitted successfully!');
      console.log('Response:', response);
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <h1>Complete Our Contact Form</h1>
      <p>Please ensure you complete this form as accurately as possible, thank you!</p>

      <label>
        Select your reason for contacting us*:
        <select name="reason" value={formData.reason} onChange={handleChange} required>
          <option value="">-- Please Select --</option>
          {reasonOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        Choose a product*:
        <select name="product" value={formData.product} onChange={handleChange} required>
          <option value="">-- Please Select --</option>
          {productOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        <input type="checkbox" name="freeSample" checked={formData.freeSample} onChange={handleChange} />
        Would you like a FREE product sample with your kit?
      </label>

      <label>
        First name*:
        <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
      </label>

      <label>
        Surname*:
        <input type="text" name="surname" value={formData.surname} onChange={handleChange} required />
      </label>

      <label>
        School or Organisation Name*:
        <input type="text" name="organisation" value={formData.organisation} onChange={handleChange} required />
      </label>

      <label>
        Your Position*:
        <input type="text" name="position" value={formData.position} onChange={handleChange} required />
      </label>

      <label>
        Number of art packs required*:
        <input type="number" name="artPacks" value={formData.artPacks} onChange={handleChange} required />
      </label>

      <label>
        Where did you hear about us?*:
        <select name="referral" value={formData.referral} onChange={handleChange} required>
          <option value="">-- Please Select --</option>
          {referralOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        Email Address*:
        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
      </label>

      <label>
        Confirm Email Address*:
        <input type="email" name="confirmEmail" value={formData.confirmEmail} onChange={handleChange} required />
      </label>

      <label>
        Contact Phone Number*:
        <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
      </label>

      <label>
        First Line of Address*:
        <input type="text" name="addressLine1" value={formData.addressLine1} onChange={handleChange} required />
      </label>

      <label>
        Second Line of Address:
        <input type="text" name="addressLine2" value={formData.addressLine2} onChange={handleChange} />
      </label>

      <label>
        Town/City*:
        <input type="text" name="city" value={formData.city} onChange={handleChange} required />
      </label>

      <label>
        County*:
        <input type="text" name="county" value={formData.county} onChange={handleChange} required />
      </label>

      <label>
        Postcode*:
        <input type="text" name="postcode" value={formData.postcode} onChange={handleChange} required />
      </label>

      <label>
        Additional Delivery Instructions:
        <textarea
          name="deliveryInstructions"
          value={formData.deliveryInstructions}
          onChange={handleChange}
          maxLength={500}
        ></textarea>
      </label>

      <label>
        <input
          type="checkbox"
          name="agreeToPromotions"
          checked={formData.agreeToPromotions}
          onChange={handleChange}
        />
        I am happy to receive the latest news updates, promotions and offers from Class Fundraising and its partnered companies.
      </label>

      <button type="submit">Submit</button>
      {message && <p>{message}</p>}
    </form>
  );
}

export default ContactForm;
