
import core.HuffmanFileCompressor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Random;

public class RoundTripTest {

    private static final HuffmanFileCompressor compressor =
            new HuffmanFileCompressor();

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {

        System.out.println("======================================");
        System.out.println(" HUFFMAN COMPRESSOR - ROUND TRIP TESTS");
        System.out.println("======================================\n");

        // Test 1: Empty input
        runRoundTripTest("Empty file", new byte[0]);

        // Test 2: One byte
        runRoundTripTest("Single byte", new byte[]{42});

        // Test 3: Repeated bytes
        byte[] repeated = new byte[10000];
        Arrays.fill(repeated, (byte) 'A');
        runRoundTripTest("10,000 repeated A bytes", repeated);

        // Test 4: Normal text
        byte[] text = (
                "Huffman coding is a lossless compression algorithm.\n"
                        + "This is a test of our offline file compressor.\n"
                        + "1234567890 !@#$%^&*()"
        ).getBytes(StandardCharsets.UTF_8);
        runRoundTripTest("Normal text", text);

        // Test 5: All 256 possible byte values
        byte[] allBytes = new byte[256];

        for (int i = 0; i < 256; i++) {
            allBytes[i] = (byte) i;
        }

        runRoundTripTest("All 256 byte values", allBytes);

        // Test 6: Random binary data
        byte[] randomData = new byte[100000];
        new Random(12345).nextBytes(randomData);
        runRoundTripTest("100 KB random binary data", randomData);

        // Test 7: Large text input (about 2 MB)
        byte[] paragraph = (
                "Huffman compression stores frequently occurring "
                        + "bytes with shorter codes. This test checks whether "
                        + "large inputs can be restored without data loss.\n"
        ).getBytes(StandardCharsets.UTF_8);

        byte[] largeText = new byte[2 * 1024 * 1024];

        for (int i = 0; i < largeText.length; i++) {
            largeText[i] = paragraph[i % paragraph.length];
        }

        runRoundTripTest("2 MB repeated text pattern", largeText);

        // Test 8: Invalid magic number
        byte[] invalidHeader = new byte[]{1, 2, 3, 4, 0, 0};
        runInvalidFileTest("Invalid magic number", invalidHeader);

        // Test 9: Truncated header
        byte[] truncatedHeader = new byte[]{'H', 'U', 'F', '1'};
        runInvalidFileTest("Truncated header", truncatedHeader);

        // Test 10: Truncated compressed data

        byte[] validCompressed;

        try {
            validCompressed = compressor.compress(
                    "This input tests truncated data."
                            .getBytes(StandardCharsets.UTF_8)
            );
        } catch (IOException e) {
            failed++;
            System.out.println(
                    "[FAIL] Could not create test data: " + e.getMessage()
            );
            return;
        }


        byte[] truncatedData = Arrays.copyOf(
                validCompressed,
                validCompressed.length - 1
        );

        runInvalidFileTest("Truncated compressed data", truncatedData);

        // Final summary
        System.out.println("\n======================================");
        System.out.println("TEST SUMMARY");
        System.out.println("Passed: " + passed);
        System.out.println("Failed: " + failed);
        System.out.println("======================================");

        if (failed == 0) {
            System.out.println("ALL TESTS PASSED!");
        } else {
            System.out.println("SOME TESTS FAILED. Review the errors above.");
        }
    }

    private static void runRoundTripTest(
            String testName,
            byte[] original) {

        try {
            byte[] compressed = compressor.compress(original);
            byte[] restored = compressor.decompress(compressed);

            if (Arrays.equals(original, restored)) {
                passed++;
                System.out.println("[PASS] " + testName
                        + " | Original: " + original.length
                        + " bytes | Compressed: " + compressed.length
                        + " bytes");
            } else {
                failed++;
                System.out.println("[FAIL] " + testName
                        + " | Restored bytes do not match");
            }

        } catch (Exception e) {
            failed++;
            System.out.println("[FAIL] " + testName
                    + " | " + e.getMessage());
        }
    }

    private static void runInvalidFileTest(
            String testName,
            byte[] compressed) {

        try {
            compressor.decompress(compressed);

            failed++;
            System.out.println("[FAIL] " + testName
                    + " | Invalid file was accepted");

        } catch (IOException | IllegalArgumentException e) {
            passed++;
            System.out.println("[PASS] " + testName
                    + " | Invalid file rejected");
        }
    }
}
