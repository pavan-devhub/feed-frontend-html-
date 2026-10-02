// "My Details" form of the user dashboard (organization identity, statutory, bank details and the
// payment QR code) with a live profile-strength ring. Saving only shows a confirmation toast - the
// form isn't wired to the backend yet, same as before.
//
//   const form = mountMyDetailsForm(containerEl);   // renders into containerEl
//   form.destroy();
//
// Inputs are patched in place (never re-rendered) so typing keeps focus and the caret.
(function () {
  'use strict';

  const { html, render, on, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');

  const initialDetails = {
    name: 'Green Valley Farmers Producer Company',
    website: '',
    gstNo: '',
    pan: '',
    regCertificate: null,
    accountHolder: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    logo: null,
    qrCode: null,
  };

  const FIELD_KEYS = ['name', 'website', 'gstNo', 'pan', 'regCertificate', 'accountHolder', 'accountNumber', 'ifsc', 'bankName', 'logo', 'qrCode'];

  // How each text field normalises what's typed (default: as typed).
  const FIELD_TRANSFORMS = {
    gstNo: (v) => v.toUpperCase(),
    pan: (v) => v.toUpperCase(),
    accountNumber: (v) => v.replace(/\D/g, ''),
    ifsc: (v) => v.toUpperCase(),
  };

  const completenessOf = (details) => {
    const filledCount = FIELD_KEYS.filter((key) => {
      const v = details[key];
      return v !== null && v !== undefined && v !== '';
    }).length;
    return Math.round((filledCount / FIELD_KEYS.length) * 100);
  };

  const completenessText = (completeness) => (completeness < 100 ? 'A few details are missing' : 'All set — looking great!');

  const logoPreviewHtml = (logo) => (logo
    ? html`<img src="${logo.url}" alt="Logo" />`
    : html`${icon('camera', { size: 22 })}<span>Upload Logo</span>`);

  const certHtml = (cert) => (cert
    ? html`
    <div class="mdf-file-chip">
      ${icon('file-text', { size: 15 })}
      <span class="mdf-file-chip-name">${cert.name}</span>
      <span class="mdf-file-chip-size">${cert.size}</span>
      ${icon('check-circle-2', { size: 15, className: 'mdf-file-chip-check' })}
      <button type="button" class="mdf-file-chip-remove">${icon('x', { size: 13 })}</button>
    </div>`
    : html`
    <div class="mdf-dropzone">
      ${icon('upload-cloud', { size: 18 })}
      <span>Click to upload PDF or image</span>
    </div>`);

  const qrPreviewHtml = (qrCode) => (qrCode
    ? html`<img src="${qrCode.url}" alt="QR Code" />`
    : html`${icon('qr-code', { size: 30 })}<span>Upload QR Code</span><small>PNG or JPG, up to 2MB</small>`);

  function mountMyDetailsForm(container) {
    let details = { ...initialDetails };
    const completeness = completenessOf(details);

    const form = toElement(html`
    <form class="mdf-wrapper">
      <div class="mdf-header">
        <div>
          <h2 class="mdf-title">My Details</h2>
          <p class="mdf-subtitle">Keep your organization's identity, statutory and banking information up to date.</p>
        </div>
        <div class="mdf-completeness">
          <div class="mdf-ring" style="--pct: ${completeness};">
            <span>${completeness}%</span>
          </div>
          <div class="mdf-completeness-text">
            <strong>Profile strength</strong>
            <span>${completenessText(completeness)}</span>
          </div>
        </div>
      </div>

      <div class="mdf-grid">
        <section class="mdf-card mdf-card-wide">
          <div class="mdf-card-head">
            <span class="mdf-card-icon indigo">${icon('building-2', { size: 18 })}</span>
            <div>
              <h3>Organization Identity</h3>
              <p>Your public-facing name, logo and website</p>
            </div>
          </div>

          <div class="mdf-identity-row">
            <div class="mdf-logo-upload">${logoPreviewHtml(details.logo)}<div class="mdf-logo-edit-badge">${icon('camera', { size: 13 })}</div><input type="file" accept="image/*" hidden data-file="logo" /></div>

            <div class="mdf-identity-fields">
              <label class="mdf-field">
                <span>Organization Name</span>
                <input type="text" value="${details.name}" placeholder="Enter your organization name" data-field="name" />
              </label>
              <label class="mdf-field">
                <span>Website</span>
                <div class="mdf-input-icon">
                  ${icon('globe', { size: 16 })}
                  <input type="url" value="${details.website}" placeholder="https://yourcooperative.com" data-field="website" />
                </div>
              </label>
            </div>
          </div>
        </section>

        <section class="mdf-card">
          <div class="mdf-card-head">
            <span class="mdf-card-icon violet">${icon('file-badge-2', { size: 18 })}</span>
            <div>
              <h3>Statutory Details</h3>
              <p>GST, PAN &amp; registration certificate</p>
            </div>
          </div>

          <label class="mdf-field">
            <span>GST No.</span>
            <input type="text" value="${details.gstNo}" placeholder="22AAAAA0000A1Z5" maxlength="15" data-field="gstNo" />
          </label>

          <label class="mdf-field">
            <span>PAN</span>
            <input type="text" value="${details.pan}" placeholder="AAAAA0000A" maxlength="10" data-field="pan" />
          </label>

          <div class="mdf-field">
            <span>Registration Certificate</span>
            ${certHtml(details.regCertificate)}
            <input type="file" accept=".pdf,image/*" hidden data-file="regCertificate" />
          </div>
        </section>

        <section class="mdf-card">
          <div class="mdf-card-head">
            <span class="mdf-card-icon emerald">${icon('landmark', { size: 18 })}</span>
            <div>
              <h3>Bank Details</h3>
              <p>For settlements and payouts</p>
            </div>
          </div>

          <label class="mdf-field">
            <span>Account Holder Name</span>
            <input type="text" value="${details.accountHolder}" placeholder="As per bank records" data-field="accountHolder" />
          </label>
          <div class="mdf-field-row">
            <label class="mdf-field">
              <span>Account Number</span>
              <input type="text" value="${details.accountNumber}" placeholder="XXXXXXXXXXXX" data-field="accountNumber" />
            </label>
            <label class="mdf-field">
              <span>IFSC Code</span>
              <input type="text" value="${details.ifsc}" placeholder="SBIN0001234" maxlength="11" data-field="ifsc" />
            </label>
          </div>
          <label class="mdf-field">
            <span>Bank Name</span>
            <div class="mdf-input-icon">
              ${icon('credit-card', { size: 16 })}
              <input type="text" value="${details.bankName}" placeholder="e.g. State Bank of India" data-field="bankName" />
            </div>
          </label>
        </section>

        <section class="mdf-card">
          <div class="mdf-card-head">
            <span class="mdf-card-icon rose">${icon('qr-code', { size: 18 })}</span>
            <div>
              <h3>Payment QR Code</h3>
              <p>Shown to members &amp; buyers for quick payments</p>
            </div>
          </div>

          <div class="mdf-qr-upload">${qrPreviewHtml(details.qrCode)}</div>
          <input type="file" accept="image/*" hidden data-file="qrCode" />
        </section>
      </div>

      <div class="mdf-action-bar">
        <span class="mdf-action-hint">${icon('sparkles', { size: 14 })} Changes are saved to your organization profile</span>
        <div class="mdf-action-buttons">
          <button type="button" class="mdf-btn-ghost">Discard</button>
          <button type="submit" class="mdf-btn-primary">${icon('save', { size: 16 })} Save Changes</button>
        </div>
      </div>

      <div class="mdf-toast ">${icon('check-circle-2', { size: 16 })} Profile updated successfully</div>
    </form>`);
    container.replaceChildren(form);

    const q = (selector) => form.querySelector(selector);
    const fileInput = (key) => q(`input[data-file="${key}"]`);
    const ring = q('.mdf-ring');
    const logoUpload = q('.mdf-logo-upload');
    const logoBadge = q('.mdf-logo-edit-badge');
    const certField = fileInput('regCertificate').parentElement;
    const qrUpload = q('.mdf-qr-upload');
    const toast = q('.mdf-toast');

    // --- drawing (in place) ----------------------------------------------------------------------

    const drawCompleteness = () => {
      const pct = completenessOf(details);
      ring.style.setProperty('--pct', String(pct));
      ring.querySelector('span').textContent = `${pct}%`;
      q('.mdf-completeness-text span').textContent = completenessText(pct);
    };

    const drawLogo = () => {
      while (logoUpload.firstChild && logoUpload.firstChild !== logoBadge) logoUpload.firstChild.remove();
      logoBadge.insertAdjacentHTML('beforebegin', String(logoPreviewHtml(details.logo)));
    };

    const drawCert = () => {
      certField.querySelector('.mdf-file-chip, .mdf-dropzone').replaceWith(toElement(certHtml(details.regCertificate)));
    };

    const drawQr = () => render(qrUpload, qrPreviewHtml(details.qrCode));

    const setField = (key, value) => {
      details = { ...details, [key]: value };
      drawCompleteness();
    };

    // --- events ----------------------------------------------------------------------------------

    on(form, 'input', 'input[data-field]', (_event, input) => {
      const key = input.dataset.field;
      const transform = FIELD_TRANSFORMS[key];
      const value = transform ? transform(input.value) : input.value;
      if (input.value !== value) input.value = value;
      setField(key, value);
    });

    const handleImageSelect = (key, file) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      if (details[key]?.url) URL.revokeObjectURL(details[key].url);
      setField(key, { name: file.name, url });
      if (key === 'logo') drawLogo();
      else drawQr();
    };

    const handleCertSelect = (file) => {
      if (!file) return;
      setField('regCertificate', { name: file.name, size: (file.size / 1024).toFixed(0) + ' KB' });
      drawCert();
    };

    on(form, 'change', 'input[data-file]', (_event, input) => {
      const file = input.files?.[0];
      if (input.dataset.file === 'regCertificate') handleCertSelect(file);
      else handleImageSelect(input.dataset.file, file);
    });

    on(form, 'click', '.mdf-logo-upload', () => fileInput('logo').click());
    on(form, 'click', '.mdf-dropzone', () => fileInput('regCertificate').click());
    on(form, 'click', '.mdf-qr-upload', () => fileInput('qrCode').click());
    on(form, 'click', '.mdf-file-chip-remove', () => {
      setField('regCertificate', null);
      drawCert();
    });

    // Discard: back to the initial values (the file inputs keep their selection, as before).
    on(form, 'click', '.mdf-btn-ghost', () => {
      details = { ...initialDetails };
      form.querySelectorAll('input[data-field]').forEach((input) => {
        const value = details[input.dataset.field];
        if (input.value !== value) input.value = value;
      });
      drawLogo();
      drawCert();
      drawQr();
      drawCompleteness();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      toast.className = 'mdf-toast show';
      setTimeout(() => { toast.className = 'mdf-toast '; }, 2600);
    });

    return {
      destroy() {},
    };
  }

  FW.define('components/my-details-form', { mountMyDetailsForm });
})();
