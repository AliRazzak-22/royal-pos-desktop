const { app, BrowserWindow } = require('electron');
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
    mainWindow.webContents.openDevTools();

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

// عندما يكون Electron جاهزاً، قم بإنشاء النافذة
app.whenReady().then(createWindow);

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
const { ipcMain } = require('electron');

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