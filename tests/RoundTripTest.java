import core.HuffmanFileCompressor;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Random;

public class RoundTripTest {
    private static final HuffmanFileCompressor C = new HuffmanFileCompressor();
    private static int passed, failed;

    public static void main(String[] args) {
        run("empty file", () -> roundTrip(new byte[0], "empty.txt"));
        run("repeated byte", () -> {
            byte[] b = new byte[10000];
            Arrays.fill(b, (byte) 'A');
            roundTrip(b, "repeat.txt");
        });
        run("normal text", () -> roundTrip(
                "This is HuffLab. Huffman and DEFLATE are tested offline.\n"
                        .getBytes(StandardCharsets.UTF_8), "sample.txt"));
        run("all 256 byte values", () -> {
            byte[] b = new byte[256];
            for (int i = 0; i < 256; i++) b[i] = (byte) i;
            roundTrip(b, "all-bytes.bin");
        });
        run("random binary", () -> {
            byte[] b = new byte[100000];
            new Random(12345).nextBytes(b);
            roundTrip(b, "random.bin");
        });
        run("2 MB repetitive input", () -> {
            byte[] b = new byte[2 * 1024 * 1024];
            byte[] p = "HuffLab repetitive text sample. ".getBytes(StandardCharsets.UTF_8);
            for (int i = 0; i < b.length; i++) b[i] = p[i % p.length];
            roundTrip(b, "large.txt");
        });
        run("path is stripped from filename", () -> {
            byte[] b = "name".getBytes(StandardCharsets.UTF_8);
            byte[] packed = C.compress(b, "C:\\private\\folder\\note.txt");
            HuffmanFileCompressor.DecompressedFile d = C.decompressFile(packed);
            if (!"note.txt".equals(d.getFilename())) throw new AssertionError(d.getFilename());
            if (!Arrays.equals(b, d.getData())) throw new AssertionError("Bytes differ");
        });
        run("bad magic rejected", () -> {
            byte[] b = C.compress("bad".getBytes(StandardCharsets.UTF_8), "bad.txt");
            b[0] = 'X';
            expectIOException(() -> C.decompressFile(b));
        });
        run("truncated HUF3 header rejected", () -> {
            byte[] b = C.compress("header".getBytes(StandardCharsets.UTF_8), "header.txt");
            expectIOException(() -> C.decompressFile(Arrays.copyOf(b, 8)));
        });
        run("truncated payload rejected", () -> {
            byte[] b = new byte[8192];
            new Random(7).nextBytes(b);
            byte[] packed = C.compress(b, "payload.bin");
            expectIOException(() -> C.decompressFile(Arrays.copyOf(packed, packed.length - 1)));
        });

        System.out.println();
        System.out.println("Passed: " + passed);
        System.out.println("Failed: " + failed);
        System.out.println(failed == 0 ? "ALL TESTS PASSED!" : "SOME TESTS FAILED");
        if (failed != 0) System.exit(1);
    }

    private static void roundTrip(byte[] input, String name) throws Exception {
        byte[] packed = C.compress(input, name);
        HuffmanFileCompressor.DecompressedFile decoded = C.decompressFile(packed);
        if (!Arrays.equals(input, decoded.getData())) throw new AssertionError("Bytes differ");
        if (!name.equals(decoded.getFilename())) {
            throw new AssertionError("Expected " + name + ", got " + decoded.getFilename());
        }
        System.out.println("  input=" + input.length + " B, output=" + packed.length
                + " B, saved=" + (input.length == 0 ? 0.0 :
                (input.length - packed.length) * 100.0 / input.length) + "%");
    }

    private static void expectIOException(Throwing action) throws Exception {
        try {
            action.run();
        } catch (IOException expected) {
            return;
        }
        throw new AssertionError("Expected IOException");
    }

    private static void run(String name, Throwing action) {
        try {
            System.out.println("[TEST] " + name);
            action.run();
            passed++;
            System.out.println("[PASS] " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("[FAIL] " + name + " — " + e);
        }
    }

    @FunctionalInterface
    private interface Throwing { void run() throws Exception; }
}
