
import server.WebServer;

public class Main {

    public static void main(String[] args) {

        int port = 8080;

        try {
            WebServer webServer = new WebServer(port);
            webServer.start();

        } catch (java.net.BindException e) {
            System.err.println(
                    "Port " + port + " is already in use. "
                            + "Close the other application or select another port."
            );

        } catch (Exception e) {
            System.err.println("Could not start the web server.");
            e.printStackTrace();
        }
    }
}
