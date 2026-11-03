const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
// تعطيل التحذيرات الأمنية المزعجة في بيئة التطوير
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow;

function createWindow() {
    // إعداد النافذة الرئيسية للتطبيق
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false, // إخفاء النافذة حتى تكتمل جاهزيتها لمنع وميض الشاشة
        autoHideMenuBar: true, // إخفاء شريط القوائم العلوي (File, Edit...)
        kiosk: true, // تفعيل وضع Kiosk (ملء الشاشة بالكامل بدون أشرطة ويندوز)
        webPreferences: {
            nodeIntegration: true, // السماح باستخدام ميزات Node.js داخل HTML
            contextIsolation: false, // السماح للمتغيرات العامة بالانتقال (لتسهيل نقل كودك الحالي)
        },
        icon: path.join(__dirname, 'icon.ico') // أيقونة التطبيق (سنضيفها لاحقاً)
    });

    // تحميل ملف الـ HTML الخاص بالنظام
    mainWindow.loadFile('index.html');

// فتح شاشة أدوات المطور (F12) برمجياً لكشف الأخطاء
    //mainWindow.webContents.openDevTools();

    // إظهار النافذة فقط بعد أن تكون جاهزة للعرض
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // إعداد التشغيل التلقائي مع الويندوز (النقطة 4 في طلبك)
    app.setLoginItemSettings({
        openAtLogin: true, // تشغيل عند تسجيل الدخول
        path: app.getPath('exe') // مسار التطبيق الحالي
    });
}

app.whenReady().then(() => {
    createWindow();
    
    // إعدادات رادار التحديثات (الحل الجذري)
    autoUpdater.autoDownload = false; // يجب أن تكون false لكي يتحكم بها الكاشير يدوياً
    autoUpdater.autoInstallOnAppQuit = true;
    
    // دالة آمنة لفحص التحديثات
    const safeCheckForUpdates = () => {
        try {
            autoUpdater.checkForUpdates().catch(err => {
                console.log('تجاهل فشل التحديث الصامت (Catch): ', err.message);
            });
        } catch (error) {
            console.log('حدث خطأ أثناء فحص التحديثات (Try/Catch): ', error.message);
        }
    };

    // فحص التحديثات بعد فتح النظام بـ 3 ثواني
    setTimeout(safeCheckForUpdates, 3000); 
    
    // فحص دوري كل ساعة 
    setInterval(safeCheckForUpdates, 60 * 60 * 1000);
});

// مضاد الصدمات الإضافي لمنع انهيار النظام
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
    // تم اعتراض الخطأ ومنع الانهيار
});

// ----------------- أحداث رادار التحديثات (OTA) -----------------
// 1. اكتشاف تحديث جديد وإخبار الكاشير
autoUpdater.on('update-available', (info) => {
    if(mainWindow) mainWindow.webContents.send('update-available', info);
});

// 2. استلام أمر "تحميل الآن" من الكاشير
ipcMain.on('start-download', () => {
    autoUpdater.downloadUpdate();
});

// 3. إرسال نسبة التحميل لشريط التقدم في الشاشة
autoUpdater.on('download-progress', (progressObj) => {
    if(mainWindow) mainWindow.webContents.send('download-progress', progressObj.percent);
});

// 4. التحديث اكتمل وجاهز للتثبيت
autoUpdater.on('update-downloaded', () => {
    if(mainWindow) mainWindow.webContents.send('update-ready');
});

// 5. استلام أمر التثبيت (يغلق النظام ويفتحه تلقائياً)
ipcMain.on('install-update', () => {
    try {
        autoUpdater.quitAndInstall();
    } catch (error) {
        if (mainWindow) mainWindow.webContents.send('update-error', error.message);
    }
});
// ---------------------------------------------------------------
// 6. استلام أوامر القائمة الجانبية (إغلاق، تصغير، فحص تحديثات) من الكاشير
ipcMain.on('close-app', () => {
    app.quit();
});

ipcMain.on('minimize-app', () => {
    if (mainWindow) mainWindow.minimize(); // ينزل التطبيق لشريط المهام (Taskbar)
});

ipcMain.on('manual-check-update', () => {
    try {
        // يجبر الرادار على فحص التحديثات فوراً استجابةً لطلب الكاشير
        autoUpdater.checkForUpdates().catch(err => {
            if(mainWindow) mainWindow.webContents.send('update-error', err.message);
        });
    } catch (error) {
        if(mainWindow) mainWindow.webContents.send('update-error', error.message);
    }
});
// إغلاق التطبيق تماماً عند إغلاق كل النوافذ
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { // استثناء أجهزة الماك
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// استلام طلب الطباعة الصامتة من الكاشير
ipcMain.on('print-silent', (event, htmlContent) => {
    // إنشاء نافذة وهمية (مخفية تماماً) مخصصة للطباعة فقط
    let printWin = new BrowserWindow({ 
        show: false,
        webPreferences: { nodeIntegration: true }
    });

    // تحويل كود الـ HTML إلى صيغة مقروءة للنافذة
    printWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));

    // بمجرد تحميل الفاتورة في النافذة المخفية، نعطي أمر الطباعة الصامتة
    printWin.webContents.on('did-finish-load', () => {
        printWin.webContents.print({
            silent: true, 
            printBackground: true, 
            deviceName: '',
            margins: { marginType: 'none' }, // مسح الهوامش الوهمية من الأعلى والأسفل
            pageSize: 'A5' // إجبار النظام على مقاس الورق الدقيق
        }, (success, failureReason) => {
            if (!success) console.log('فشلت الطباعة:', failureReason);
            // إغلاق النافذة الوهمية فور الانتهاء لتنظيف الذاكرة
            printWin.close();
        });
    });
});