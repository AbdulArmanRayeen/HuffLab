
import core.TextDictionaryCodec;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class TextDictionaryCodecTest {

    public static void main(String[] args) throws Exception {
        String repeated =
                "ERROR: Connection timed out at server node 42\r\n"
                        .repeat(1000);

        byte[] original = repeated.getBytes(StandardCharsets.UTF_8);

        byte[] encoded = TextDictionaryCodec.encode(original);
        byte[] restored = TextDictionaryCodec.decode(encoded);

        System.out.println("Original bytes:  " + original.length);
        System.out.println("Dictionary bytes: " + encoded.length);
        System.out.println("Exact restoration: "
                + Arrays.equals(original, restored));

        if (!Arrays.equals(original, restored)) {
            throw new AssertionError("Round-trip test failed.");
        }

        byte[] empty = new byte[0];
        if (!Arrays.equals(
                empty,
                TextDictionaryCodec.decode(
                        TextDictionaryCodec.encode(empty)))) {
            throw new AssertionError("Empty file test failed.");
        }

        byte[] allBytes = new byte[256];
        for (int i = 0; i < 256; i++) {
            allBytes[i] = (byte) i;
        }

        if (TextDictionaryCodec.isEligible(allBytes)) {
            // This is acceptable only if the bytes happen to form valid UTF-8.
            System.out.println("All-byte input is valid UTF-8.");
        } else {
            System.out.println("All-byte input correctly rejected as text.");
        }

        System.out.println("ALL DICTIONARY TESTS PASSED");
    }
}
