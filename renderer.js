document.getElementById('startButton').addEventListener('click', () => {
  const url = document.getElementById('urlInput').value;
  const usernameSelector = document.getElementById('usernameSelector').value;
  const passwordSelector = document.getElementById('passwordSelector').value;
  const username = document.getElementById('usernameInput').value;
  const password = document.getElementById('passwordInput').value;
  const loginButtonSelector = document.getElementById('loginButtonSelector').value;
  const linkTologin = document.getElementById('textLoginLink').value;
  const bookSelector = document.getElementById('bookSelector').value;
  const nextButtonSelector = document.getElementById('selectorInput').value;

  if (!url || !usernameSelector || !passwordSelector || !username || !password || !loginButtonSelector || !linkTologin || !bookSelector || !nextButtonSelector) {
    alert('Por favor completa todos los campos.');
    return;
  }

  console.log('Iniciando descarga con los siguientes datos:', {
    url, usernameSelector, passwordSelector, username, password, loginButtonSelector, linkTologin, bookSelector, nextButtonSelector,
  });

  window.api.send('start-download', {
    url,
    usernameSelector,
    passwordSelector,
    username,
    password,
    loginButtonSelector,
    linkTologin,
    bookSelector,
    nextButtonSelector,
  });
});



window.api.receive('update-available', () => {
  alert('¡Nueva actualización disponible! Se está descargando.');
});

window.api.receive('update-downloaded', () => {
  const userConfirmed = confirm('¡Actualización descargada! ¿Deseas reiniciar la aplicación para instalarla?');
  if (userConfirmed) {
    window.api.send('restart-to-update');
  }
});

