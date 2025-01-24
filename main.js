const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();

  // Configurar auto-updater
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    console.log('Nueva actualización disponible.');
    mainWindow.webContents.send('update-available');
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Actualización descargada. Lista para instalar.');
    mainWindow.webContents.send('update-downloaded');
  });
  
  ipcMain.on('restart-to-update', () => {
    autoUpdater.quitAndInstall();
  });
});


ipcMain.on('start-download', async (event, args) => {
  console.log('Descarga iniciada con parámetros:', args);

  const puppeteer = require('puppeteer');
  const { PDFDocument } = require('pdf-lib');
  const axios = require('axios');

  const outputDir = app.isPackaged
    ? path.join(app.getPath('documents'), 'IB-Book-Downloader')
    : path.join(__dirname, 'downloads');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navegar al inicio de sesión
    console.log(`Navegando a: ${args.url}`);
    await page.goto(args.url);

    // Completar credenciales dinámicamente
    console.log(`Rellenando usuario y contraseña usando selectores: ${args.usernameSelector}, ${args.passwordSelector}`);
    await page.type(args.usernameSelector, args.username);
    await page.type(args.passwordSelector, args.password);

    // Hacer clic en el botón de inicio de sesión
    console.log(`Haciendo clic en el botón de ingreso: ${args.loginButtonSelector}`);
    await page.click(args.loginButtonSelector);
    // await page.waitForNavigation();

    // Seleccionar el libro
    console.log(`Buscando botón con texto: ${args.bookSelector}`);

    // Encuentra todos los enlaces en la página
    let links = await page.$$('a');
    
    // Busca el enlace que tenga el texto interno correspondiente
    let bookLink = null;
    for (const link of links) {
      const text = await page.evaluate(el => el.innerText, link);
      if (text.trim() === args.bookSelector) {
        bookLink = link;
        break;
      }
    }
    
    if (!bookLink) {
      throw new Error('Enlace del libro no encontrado');
    }
    
    // Haz clic en el enlace
    await bookLink.click();
    // await page.waitForNavigation();

    console.log(`Buscando botón con texto: ${args.linkTologin}`);

    // Encuentra todos los enlaces en la página
    links = await page.$$('a');
    
    // Busca el enlace que tenga el texto interno correspondiente
    let LinktoLog = null;
    for (const link of links) {
      const text = await page.evaluate(el => el.innerText, link);
      if (text.trim() === args.linkTologin) {
        bookLink = link;
        break;
      }
    }
    
    if (!LinktoLog) {
      throw new Error('Enlace del libro no encontrado');
    }
    
    // Haz clic en el enlace
    await bookLink.click();

    // await page.waitForNavigation();

    // Interceptar imágenes
    const imageUrls = new Set();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'image') {
        console.log(`Interceptada URL de imagen: ${request.url()}`);
        imageUrls.add(request.url());
      }
      request.continue();
    });

    let hasNextPage = true;
    while (hasNextPage) {
      try {
        const nextButton = await page.$(args.nextButtonSelector);
        if (!nextButton) {
          console.log('Botón "Siguiente" no encontrado. Finalizando navegación.');
          hasNextPage = false;
          break;
        }

        console.log('Haciendo clic en el botón "Siguiente"...');
        await nextButton.click();
      } catch (error) {
        console.log('Error durante la navegación:', error.message);
        hasNextPage = false;
      }
    }

    await browser.close();

    console.log('URLs de imágenes capturadas:', [...imageUrls]);

    const imagePaths = [];
    for (const [index, url] of [...imageUrls].entries()) {
      try {
        console.log(`Descargando imagen: ${url}`);
      const imagePath = path.join(outputDir, `page-${index + 1}.jpg`);
      const response = await axios({ url, responseType: 'stream' });
      await new Promise((resolve, reject) => {
        const stream = fs.createWriteStream(imagePath);
        response.data.pipe(stream);
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

          console.log(`Imagen guardada en: ${imagePath}`);
      imagePaths.push(imagePath);
        } catch (error) {
          console.error(`Error descargando la imagen ${url}: ${error.message}`);
        }
    }

    const pdfDoc = await PDFDocument.create();
    for (const imagePath of imagePaths) {
      const jpgImageBytes = fs.readFileSync(imagePath);
      const jpgImage = await pdfDoc.embedJpg(jpgImageBytes);
      const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
      page.drawImage(jpgImage, { x: 0, y: 0 });
    }
    const pdfPath = path.join(outputDir, 'book.pdf');
    fs.writeFileSync(pdfPath, await pdfDoc.save());

    console.log(`PDF guardado en: ${pdfPath}`);
    event.reply('download-complete', { success: true, pdfPath });
  } catch (error) {
    console.error('Error durante la descarga:', error.message);
    event.reply('download-complete', { success: false, error: error.message });
  } finally {
    if (browser) await browser.close();
      event.reply('download-complete', { success: false, error: error.message });
  }
});
