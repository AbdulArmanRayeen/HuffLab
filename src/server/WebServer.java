
package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.Executors;

public class WebServer {

    private final HttpServer server;

    public WebServer(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);

        Handlers handlers = new Handlers();

        server.createContext("/api/compress", handlers::compress);
        server.createContext("/api/decompress", handlers::decompress);
        server.createContext("/", this::serveStaticFile);

        server.setExecutor(Executors.newFixedThreadPool(4));
    }

    public void start() {
        server.start();
        System.out.println(
                "Huffman Compressor running at http://localhost:8080"
        );
        System.out.println("Press Ctrl+C in the console to stop the server.");
    }

    private void serveStaticFile(HttpExchange exchange)
            throws IOException {

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "GET method required.");
            return;
        }

        String requestPath = exchange.getRequestURI().getPath();

        if (requestPath.equals("/")) {
            requestPath = "/index.html";
        }

        Path webRoot = Path.of("web").toAbsolutePath().normalize();

        Path file = webRoot.resolve(
                requestPath.substring(1)
        ).normalize();

        // Prevent requests from accessing files outside the web folder.
        if (!file.startsWith(webRoot)) {
            sendText(exchange, 403, "Access denied.");
            return;
        }

        if (!Files.isRegularFile(file)) {
            sendText(exchange, 404, "File not found: " + requestPath);
            return;
        }

        String contentType = getContentType(file);

        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");

        byte[] content = Files.readAllBytes(file);

        exchange.sendResponseHeaders(200, content.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(content);
        }
    }

    private String getContentType(Path file) {
        String name = file.getFileName().toString().toLowerCase();

        if (name.endsWith(".html")) {
            return "text/html; charset=UTF-8";
        }
        if (name.endsWith(".css")) {
            return "text/css; charset=UTF-8";
        }
        if (name.endsWith(".js")) {
            return "text/javascript; charset=UTF-8";
        }
        if (name.endsWith(".json")) {
            return "application/json; charset=UTF-8";
        }

        return "application/octet-stream";
    }

    private void sendText(
            HttpExchange exchange,
            int status,
            String message) throws IOException {

        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
                "Content-Type", "text/plain; charset=UTF-8"
        );

        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
