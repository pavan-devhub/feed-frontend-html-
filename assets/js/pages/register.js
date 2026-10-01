// Register - the account sign-up form. The District list follows the chosen State, and the
// "User Type" choices come from the backend (GET /api/user-types).
import { initPage } from '../core/page.js';
import { html, render, on, toElement } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import { API_BASE_URL } from '../core/config.js';

const apDistricts = [
  'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla',
  'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur',
  'Kakinada', 'Krishna', 'Kurnool', 'Markapuram (Newly formed)', 'Nandyal', 'NTR',
  'Palnadu', 'Parvathipuram Manyam', 'Polavaram (Newly formed)', 'Prakasam',
  'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai', 'Srikakulam', 'Tirupati',
  'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'Y.S.R. Kadapa',
].sort();

const tgDistricts = [
  'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial', 'Jangaon',
  'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam',
  'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak',
  'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet',
  'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Ranga Reddy',
  'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal',
  'Yadadri Bhuvanagiri',
].sort();

// Main brand colors
const brandGreen = '#3e6b36';
const textDark = '#1a1a1a';
const inputBg = '#ffffff';
const inputBorder = '#e5e7eb';

const session = initPage({ page: 'register', access: 'public' });
if (session) initRegister();

function notificationHtml(notification) {
  const success = notification.type === 'success';
  return html`
    <div style="position: absolute; top: 24px; left: 50%; transform: translateX(-50%); background: ${success ? '#ecfdf5' : '#fef2f2'}; color: ${success ? '#065f46' : '#991b1b'}; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; z-index: 1000; border: 1px solid ${success ? '#6ee7b7' : '#fecaca'}; animation: slideDown 0.3s ease-out;">
      ${success ? icon('check', { size: 20, color: '#059669' }) : icon('alert-circle', { size: 20, color: '#dc2626' })}
      <span style="font-size: 14px; font-weight: 500;">${notification.message}</span>
      <button data-action="close-notification" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: inherit; margin-left: 8px;">
        ${icon('x', { size: 16 })}
      </button>
    </div>`;
}

function initRegister() {
  const panel = document.getElementById('register-panel');
  const header = document.getElementById('register-header');
  const form = document.getElementById('register-form');
  const field = (name) => form.querySelector(`[name="${name}"]`);
  const districtSelect = field('district');
  const dobInput = field('dob');
  const userTypeSelect = field('userType');
  const submitButton = form.querySelector('button[type="submit"]');

  const state = {
    formData: {
      firstName: '',
      middleName: '',
      lastName: '',
      gender: '',
      phone: '',
      dob: '',
      email: '',
      education: '',
      password: '',
      confirmPassword: '',
      state: '',
      district: '',
      city: '',
      userType: '',
    },
    notification: null,
    isSubmitting: false,
    // The "User Type" choices come from the backend's user_types table (GET /api/user-types), so a
    // type added there shows up here without a frontend change. null = still loading.
    userTypes: null,
    userTypesError: false,
  };

  // What the page currently shows (the static HTML is the initial state).
  const rendered = {
    notification: null, districtState: '', dob: '', userTypes: null, isSubmitting: false,
  };
  let notificationEl = null;

  function drawNotification() {
    if (state.notification === rendered.notification) return;
    rendered.notification = state.notification;
    if (!state.notification) {
      notificationEl?.remove();
      notificationEl = null;
      return;
    }
    const fresh = toElement(notificationHtml(state.notification));
    if (notificationEl) {
      // Same popup, new content - updating it in place keeps the slide-down from replaying.
      notificationEl.setAttribute('style', fresh.getAttribute('style'));
      notificationEl.innerHTML = fresh.innerHTML;
    } else {
      notificationEl = fresh;
      header.after(fresh);
    }
  }

  function draw() {
    const { formData } = state;
    drawNotification();

    if (rendered.districtState !== formData.state) {
      rendered.districtState = formData.state;
      const districts = formData.state === 'Andhra Pradesh' ? apDistricts
        : formData.state === 'Telangana' ? tgDistricts : [];
      render(districtSelect, html`
        <option value="" disabled>Select District</option>
        ${districts.map((d) => html`<option value="${d}">${d}</option>`)}`);
      districtSelect.value = formData.district;
      districtSelect.disabled = !formData.state;
      districtSelect.style.cursor = formData.state ? 'pointer' : 'not-allowed';
      districtSelect.style.backgroundColor = formData.state ? inputBg : '#f9fafb';
    }

    if (rendered.dob !== formData.dob) {
      rendered.dob = formData.dob;
      dobInput.style.color = formData.dob ? textDark : '#9ca3af';
    }

    if (rendered.userTypes !== state.userTypes) {
      rendered.userTypes = state.userTypes;
      const placeholder = state.userTypes === null
        ? 'Loading user types…'
        : state.userTypesError ? "Couldn't load user types - please refresh" : 'Select User Type';
      render(userTypeSelect, html`
        <option value="" disabled>${placeholder}</option>
        ${(state.userTypes || []).map((type) => html`<option value="${type}">${type}</option>`)}`);
      userTypeSelect.value = formData.userType;
    }

    if (rendered.isSubmitting !== state.isSubmitting) {
      rendered.isSubmitting = state.isSubmitting;
      submitButton.disabled = state.isSubmitting;
      submitButton.style.opacity = state.isSubmitting ? '0.7' : '1';
      render(submitButton, state.isSubmitting
        ? html`<span>Registering...</span>`
        : html`${icon('check', { size: 20 })}Register`);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (!name) return;
    if (name === 'state') {
      state.formData = { ...state.formData, state: value, district: '' };
    } else {
      state.formData = { ...state.formData, [name]: value };
    }
    draw();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { formData } = state;
    if (formData.password !== formData.confirmPassword) {
      state.notification = { type: 'error', message: 'Passwords do not match!' };
      draw();
      return;
    }

    state.isSubmitting = true;
    state.notification = null;
    draw();

    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        state.notification = { type: 'success', message: data?.message || 'Registration successful!' };
        draw();
        setTimeout(() => {
          navigate('login');
        }, 3000);
      } else {
        let errorMessage = 'Registration failed. Please try again.';
        if (data) {
          if (data.error) {
            errorMessage = data.error;
          } else if (Object.keys(data).length > 0) {
            // Handle validation errors by getting the first one
            const firstErrorKey = Object.keys(data)[0];
            errorMessage = `${firstErrorKey}: ${data[firstErrorKey]}`;
          }
        }
        state.notification = { type: 'error', message: errorMessage };
        draw();
      }
    } catch (error) {
      console.error('Registration error:', error);
      state.notification = { type: 'error', message: 'Network error. Please make sure the backend is running.' };
    } finally {
      state.isSubmitting = false;
      draw();
    }
  }

  // --- events -------------------------------------------------------------------------------
  form.addEventListener('submit', handleSubmit);
  on(form, 'input', 'input:not([type="radio"])', handleChange);
  on(form, 'change', 'select, input[type="radio"]', handleChange);

  // Input / select borders turn brand green while focused (the gender radios have their own style).
  on(form, 'focusin', 'input:not([type="radio"]), select', (e) => { e.target.style.borderColor = brandGreen; });
  on(form, 'focusout', 'input:not([type="radio"]), select', (e) => { e.target.style.borderColor = inputBorder; });

  on(form, 'mouseover', 'button[type="submit"]', (_e, el) => { if (!state.isSubmitting) el.style.background = '#2c5225'; });
  on(form, 'mouseout', 'button[type="submit"]', (_e, el) => { if (!state.isSubmitting) el.style.background = brandGreen; });

  on(panel, 'click', '[data-action="close-notification"]', () => {
    state.notification = null;
    draw();
  });

  // Anything typed before this module ran.
  Array.from(form.elements).forEach((el) => {
    if (!el.name || !(el.name in state.formData)) return;
    if (el.type === 'radio') {
      if (el.checked) state.formData.gender = el.value;
    } else if (el.name !== 'district') {
      state.formData[el.name] = el.value;
    }
  });
  draw();

  fetch(`${API_BASE_URL}/api/user-types`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((types) => {
      state.userTypes = types.map((t) => t.name);
      draw();
    })
    .catch(() => {
      state.userTypes = [];
      state.userTypesError = true;
      draw();
    });
}
