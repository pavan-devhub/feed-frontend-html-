// "Register for EPM": pick one of the upcoming EPMs, fill in your details, get a confirmation.
import { initPage } from '../core/page.js';
import { submitEpmRegistration } from '../api/epm-api.js';
import { initEventSignup } from './epm/event-signup.js';

const session = initPage({ page: 'epm' });

if (session) {
  initEventSignup({
    actionLabel: 'Register for this EPM',
    emptyMessage: 'There are no upcoming EPMs open for registration right now. Please check back soon.',
    initialData: {
      fullName: '',
      mobileNumber: '',
      email: '',
      state: '',
      district: '',
      participantType: '',
      consent: false,
    },
    validate(data) {
      const errors = {};
      if (!data.fullName.trim()) errors.fullName = 'Full Name is required';
      if (!data.mobileNumber.trim()) {
        errors.mobileNumber = 'Mobile Number is required';
      } else if (!/^[0-9]{10}$/.test(data.mobileNumber.replace(/\s+/g, ''))) {
        errors.mobileNumber = 'Enter a valid 10-digit mobile number';
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Enter a valid email address';
      }
      if (!data.state.trim()) errors.state = 'State is required';
      if (!data.district.trim()) errors.district = 'District is required';
      if (!data.participantType) errors.participantType = 'Please select a participant type';
      return errors;
    },
    submit: (epm, data) => submitEpmRegistration({
      epmEventId: epm.id,
      fullName: data.fullName.trim(),
      mobileNumber: data.mobileNumber.trim(),
      email: data.email.trim() || null,
      state: data.state.trim(),
      district: data.district.trim(),
      participantType: data.participantType,
      consent: data.consent,
    }),
  });
}
