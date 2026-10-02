// "Become an EPM Volunteer": pick one of the upcoming EPMs, send a short application, get a
// confirmation.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { submitEpmVolunteer } = FW.require('api/epm-api');
  const { initEventSignup } = FW.require('pages/epm/event-signup');

  const session = initPage({ page: 'epm' });

  if (session) {
    initEventSignup({
      actionLabel: 'Volunteer for this EPM',
      emptyMessage: 'There are no upcoming EPMs looking for volunteers right now. Please check back soon.',
      initialData: {
        fullName: '',
        mobileNumber: '',
        email: '',
        state: '',
        district: '',
        experience: '',
        reason: '',
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
        if (!data.district.trim()) errors.district = 'District/City is required';
        if (!data.experience) errors.experience = 'Please select your background';
        return errors;
      },
      submit: (epm, data) => submitEpmVolunteer({
        epmEventId: epm.id,
        fullName: data.fullName.trim(),
        mobileNumber: data.mobileNumber.trim(),
        email: data.email.trim() || null,
        state: data.state.trim(),
        district: data.district.trim(),
        experience: data.experience,
        reason: data.reason.trim() || null,
      }),
    });
  }
})();
