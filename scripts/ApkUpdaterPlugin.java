package com.clantb3st.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
    private static final String PREFS = "clantb3st_apk_updates";

    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
            JSObject result = new JSObject();
            result.put("versionCode", code);
            result.put("versionName", info.versionName == null ? "" : info.versionName);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo leer la versión instalada.", error);
        }
    }

    @PluginMethod
    public void startDownload(PluginCall call) {
        String url = call.getString("url");
        String checksum = call.getString("sha256");
        if (url == null || checksum == null || !checksum.matches("(?i)[a-f0-9]{64}")) {
            call.reject("El enlace o la huella SHA-256 del APK no son válidos.");
            return;
        }
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme()) || !"github.com".equals(uri.getHost())
            || !uri.getPath().matches("/Alextbest/CL4NTB3ST/releases/download/apk-[0-9]+/app-release\\.apk")) {
            call.reject("Solo se permiten APK publicados en las versiones oficiales de CL4N TB3ST.");
            return;
        }
        try {
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("Actualización de CL4N TB3ST");
            request.setDescription("Descargando la nueva versión de la aplicación");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(false);
            request.setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS, "clantb3st-update.apk");
            long id = manager.enqueue(request);
            getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("sha256_" + id, checksum.toLowerCase(Locale.ROOT)).apply();
            JSObject result = new JSObject();
            result.put("downloadId", id);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo iniciar la descarga del APK.", error);
        }
    }

    @PluginMethod
    public void getDownloadStatus(PluginCall call) {
        long id = call.getLong("downloadId", -1L);
        if (id < 0) {
            call.reject("Identificador de descarga no válido.");
            return;
        }
        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
        try (android.database.Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                call.reject("No se encontró la descarga.");
                return;
            }
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            String state = "pending";
            if (status == DownloadManager.STATUS_RUNNING) state = "running";
            else if (status == DownloadManager.STATUS_PAUSED) state = "paused";
            else if (status == DownloadManager.STATUS_SUCCESSFUL) state = "successful";
            else if (status == DownloadManager.STATUS_FAILED) state = "failed";
            JSObject result = new JSObject();
            result.put("status", state);
            result.put("bytesDownloaded", downloaded);
            result.put("totalBytes", total);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo consultar la descarga.", error);
        }
    }

    @PluginMethod
    public void installDownloaded(PluginCall call) {
        long id = call.getLong("downloadId", -1L);
        String expected = call.getString("sha256");
        if (id < 0 || expected == null || !expected.matches("(?i)[a-f0-9]{64}")) {
            call.reject("No se pudo verificar el paquete descargado.");
            return;
        }
        try {
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
            try (android.database.Cursor cursor = manager.query(query)) {
                if (cursor == null || !cursor.moveToFirst()
                    || cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) != DownloadManager.STATUS_SUCCESSFUL) {
                    call.reject("La descarga todavía no está completa.");
                    return;
                }
            }
            Uri apkUri = manager.getUriForDownloadedFile(id);
            if (apkUri == null) {
                call.reject("Android no pudo localizar el APK descargado.");
                return;
            }
            String actual = sha256(apkUri);
            if (!actual.equalsIgnoreCase(expected)) {
                manager.remove(id);
                call.reject("La verificación de seguridad del APK falló. Descárgalo otra vez.");
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(settings);
                JSObject result = new JSObject();
                result.put("needsPermission", true);
                call.resolve(result);
                return;
            }
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(apkUri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(install);
            JSObject result = new JSObject();
            result.put("launched", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("No se pudo abrir el instalador de Android.", error);
        }
    }

    private String sha256(Uri uri) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
            if (input == null) throw new IllegalStateException("No se pudo leer el APK.");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        StringBuilder output = new StringBuilder();
        for (byte value : digest.digest()) output.append(String.format(Locale.ROOT, "%02x", value & 0xff));
        return output.toString();
    }
}
