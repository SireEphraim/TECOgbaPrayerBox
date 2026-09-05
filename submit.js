(() => {
  const CATEGORIES = ['General', 'Health', 'Family', 'Finance', 'Relationships', 'Guidance', 'Thanksgiving'];
  let selectedCategory = null;

  const $ = (id) => document.getElementById(id);
  const form = $('prayer-form');
  const submitButton = $('submit-btn');
  const message = $('submit-message');

  function setMessage(text, kind) {
    message.textContent = text;
    message.className = `message ${kind}`;
  }

  function renderCategories() {
    const container = $('category-pills');
    container.innerHTML = '';
    CATEGORIES.forEach((category) => {
      const button = document.createElement('button');
      const isSelected = category === selectedCategory;
      button.type = 'button';
      button.className = `pill${isSelected ? ' selected' : ''}`;
      button.textContent = category;
      button.setAttribute('aria-pressed', String(isSelected));
      button.addEventListener('click', () => {
        selectedCategory = selectedCategory === category ? null : category;
        renderCategories();
      });
      container.appendChild(button);
    });
  }

  function resetForm() {
    form.reset();
    selectedCategory = null;
    $('text-error').classList.add('hidden');
    message.className = 'message hidden';
    renderCategories();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const requestText = $('prayer-text').value.trim();
    const textError = $('text-error');
    message.className = 'message hidden';

    if (!requestText) {
      textError.classList.remove('hidden');
      $('prayer-text').focus();
      return;
    }
    textError.classList.add('hidden');

    if (!window.PrayerBox.configured) {
      setMessage(window.PrayerBox.configurationMessage, 'error');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';
    const { error } = await window.PrayerBox.client
      .from('prayer_requests')
      .insert({
        request_text: requestText,
        category: selectedCategory,
        urgent: $('urgent-check').checked
      });

    submitButton.disabled = false;
    submitButton.textContent = 'Send prayer request';

    if (error) {
      setMessage('We could not send that request. Please check your connection and try again.', 'error');
      return;
    }

    resetForm();
    $('submit-view').classList.add('hidden');
    $('confirmation-view').classList.remove('hidden');
  });

  $('send-another-btn').addEventListener('click', () => {
    $('confirmation-view').classList.add('hidden');
    $('submit-view').classList.remove('hidden');
    $('prayer-text').focus();
  });

  renderCategories();
})();
