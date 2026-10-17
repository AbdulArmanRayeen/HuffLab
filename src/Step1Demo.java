
import core.HuffmanEncoder;
import core.HuffmanDecoder;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class Step1Demo {

    public static void main(String[] args) {

        // Test data
        byte[] original =
                "AAAABBC".getBytes(StandardCharsets.US_ASCII);

        HuffmanEncoder encoder = new HuffmanEncoder();
        HuffmanDecoder decoder = new HuffmanDecoder();

        // Encode the input
        HuffmanEncoder.EncodedData result =
                encoder.encode(original);

        long[] frequencies = result.getFrequencies();
        String[] codes = result.getCodes();

        System.out.println("===== HUFFMAN COMPRESSION DEMO =====");

        System.out.println("\nOriginal text: "
                + new String(original, StandardCharsets.US_ASCII));

        System.out.println("Original size: "
                + (original.length * 8L) + " bits");

        System.out.println("\nFrequency and code table:");
        System.out.println("Character | Frequency | Huffman Code");

        for (int i = 0; i < 256; i++) {
            if (frequencies[i] > 0) {
                char character = (char) i;

                System.out.printf(
                        "    %c     |     %d     | %s%n",
                        character,
                        frequencies[i],
                        codes[i]
                );
            }
        }

        String encodedBits = result.getEncodedBits();

        System.out.println("\nEncoded bits: " + encodedBits);
        System.out.println("Encoded bit count: "
                + encodedBits.length());

        double saved = original.length * 8L
                - encodedBits.length();

        double percentageSaved =
                (saved / (original.length * 8.0)) * 100.0;

        System.out.printf(
                "Theoretical bit reduction: %.2f%%%n",
                percentageSaved
        );

        // Decode the data
        byte[] restored = decoder.decode(result);

        System.out.println("\nRestored text: "
                + new String(restored, StandardCharsets.US_ASCII));

        System.out.println("Original and restored bytes match: "
                + Arrays.equals(original, restored));

        if (Arrays.equals(original, restored)) {
            System.out.println("\nTEST PASSED");
        } else {
            System.out.println("\nTEST FAILED");
        }
    }
}
