
import core.HuffmanFileCompressor;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

public class Step2Demo {

    public static void main(String[] args) {

        // Change this path to test another file.
        Path inputPath = Path.of("sample.txt");

        try {
            if (!Files.isRegularFile(inputPath)) {
                System.out.println(
                        "File not found: " + inputPath.toAbsolutePath()
                );
                System.out.println(
                        "Create sample.txt in the project root first."
                );
                return;
            }

            byte[] original = Files.readAllBytes(inputPath);

            HuffmanFileCompressor compressor =
                    new HuffmanFileCompressor();

            // Compress the original file.
            byte[] compressed = compressor.compress(original);

            Path compressedPath =
                    Path.of(inputPath.getFileName() + ".huff");

            Files.write(compressedPath, compressed);

            // Decompress the saved .huff file.
            byte[] savedCompressed =
                    Files.readAllBytes(compressedPath);

            byte[] restored = compressor.decompress(savedCompressed);

            String originalName =
                    inputPath.getFileName().toString();

            Path restoredPath =
                    Path.of("restored_" + originalName);

            Files.write(restoredPath, restored);

            // Calculate statistics.
            long originalSize = original.length;
            long compressedSize = compressed.length;

            double ratio = originalSize == 0
                    ? 0.0
                    : compressedSize * 100.0 / originalSize;

            double savedPercent = originalSize == 0
                    ? 0.0
                    : (originalSize - compressedSize)
                    * 100.0 / originalSize;

            System.out.println("===== HUFFMAN FILE COMPRESSOR =====");
            System.out.println("Original file: " + inputPath);
            System.out.println("Compressed file: " + compressedPath);
            System.out.println("Restored file: " + restoredPath);

            System.out.println("\nOriginal size: "
                    + originalSize + " bytes");
            System.out.println("Compressed size: "
                    + compressedSize + " bytes");

            System.out.printf(
                    "Compressed size ratio: %.2f%%%n", ratio
            );

            System.out.printf(
                    "Space saved: %.2f%%%n", savedPercent
            );

            boolean matches = Arrays.equals(original, restored);

            System.out.println(
                    "Original and restored bytes match: " + matches
            );

            System.out.println(
                    matches ? "TEST PASSED" : "TEST FAILED"
            );

        } catch (IOException | IllegalArgumentException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
