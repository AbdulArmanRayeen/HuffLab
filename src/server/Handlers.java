package server;

import com.sun.net.httpserver.HttpExchange;
import core.HuffmanFileCompressor;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class Handlers {
    private static final int MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
    private final HuffmanFileCompressor compressor = new HuffmanFileCompressor();

    public void compress(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendError(exchange, 405, "POST method required.");
            return;
        }
        try {
            byte[] original = readLimited(exchange.getRequestBody());
            String filename = getQueryParameter(
                    exchange.getRequestURI().getRawQuery(), "name");
            if (filename == null || filename.isBlank()) filename = "file.bin";

            byte[] compressed = compressor.compress(original, filename);
            double ratio = original.length == 0 ? 0.0
                    : compressed.length * 100.0 / original.length;
            double saved = original.length == 0 ? 0.0
                    : (original.length - compressed.length) * 100.0 / original.length;

            exchange.getResponseHeaders().set("Content-Type", "application/octet-stream");
            setFilenameHeader(exchange, "X-Output-Filename", safeCompressedName(filename));
            exchange.getResponseHeaders().set("X-Compression-Format", "HUF3");
            exchange.getResponseHeaders().set("X-Original-Size", String.valueOf(original.length));
            exchange.getResponseHeaders().set("X-Compressed-Size", String.valueOf(compressed.length));
            exchange.getResponseHeaders().set("X-Ratio",
                    String.format(java.util.Locale.ROOT, "%.2f", ratio));
            exchange.getResponseHeaders().set("X-Space-Saved",
                    String.format(java.util.Locale.ROOT, "%.2f", saved));
            sendBytes(exchange, 200, compressed);
        } catch (UploadTooLargeException e) {
            sendError(exchange, 413, e.getMessage());
        } catch (IllegalArgumentException e) {
            sendError(exchange, 400, "Invalid request: " + e.getMessage());
        } catch (IOException e) {
            sendError(exchange, 500, "Compression failed.");
        }
    }

    public void decompress(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendError(exchange, 405, "POST method required.");
            return;
        }
        try {
            byte[] compressed = readLimited(exchange.getRequestBody());
            HuffmanFileCompressor.DecompressedFile decoded =
                    compressor.decompressFile(compressed);
            byte[] restored = decoded.getData();

            exchange.getResponseHeaders().set("Content-Type", "application/octet-stream");
            setFilenameHeader(exchange, "X-Output-Filename", decoded.getFilename());
            exchange.getResponseHeaders().set("X-Restored-Size", String.valueOf(restored.length));
            sendBytes(exchange, 200, restored);
        } catch (UploadTooLargeException e) {
            sendError(exchange, 413, e.getMessage());
        } catch (IOException | IllegalArgumentException e) {
            sendError(exchange, 400,
                    "Decompression failed. Check that this is a valid .huff file.");
        }
    }

    private static void setFilenameHeader(
            HttpExchange exchange, String header, String filename) {
        exchange.getResponseHeaders().set(header,
                URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20"));
    }

    private static String safeCompressedName(String input) {
        String name = input == null ? "file.bin" : input;
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) name = name.substring(slash + 1);
        if (name.isBlank()) name = "file.bin";
        return name + ".huff";
    }

    private static String getQueryParameter(String query, String key) {
        if (query == null || query.isBlank()) return null;
        for (String pair : query.split("&")) {
            int equals = pair.indexOf('=');
            String rawKey = equals >= 0 ? pair.substring(0, equals) : pair;
            String rawValue = equals >= 0 ? pair.substring(equals + 1) : "";
            if (key.equals(URLDecoder.decode(rawKey, StandardCharsets.UTF_8))) {
                return URLDecoder.decode(rawValue, StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private byte[] readLimited(InputStream input) throws IOException {
        try (input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (count > MAX_UPLOAD_SIZE - total) {
                    throw new UploadTooLargeException("Maximum upload size is 50 MB.");
                }
                output.write(buffer, 0, count);
                total += count;
            }
            return output.toByteArray();
        }
    }

    private void sendBytes(HttpExchange exchange, int status, byte[] bytes) throws IOException {
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private void sendError(HttpExchange exchange, int status, String message) throws IOException {
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private static class UploadTooLargeException extends IOException {
        UploadTooLargeException(String message) { super(message); }
    }
}
