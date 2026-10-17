# HuffLab — Huffman + DEFLATE Compression

This version keeps the original Huffman coding implementation as the DSA component and adds Java's built-in DEFLATE compressor as an alternative. The program compresses with both methods and stores the smaller payload in a versioned `HUF3` wrapper.

## Offline requirements
- JDK with `java` and `javac`
- No Maven, Gradle, network access, or third-party libraries

## HUF3 layout
- 4 bytes: `HUF3`
- 8 bytes: original file length
- 2 bytes: UTF-8 filename length
- filename bytes
- 1 byte codec ID (`1` = Huffman payload, `2` = DEFLATE payload)
- 4 bytes: payload length
- payload bytes

Legacy HUF1 and HUF2 files remain readable. New compressed files use HUF3.

## Important
The app compares payload sizes for Huffman and DEFLATE. Since the outer wrapper is identical for both choices, selecting the shorter payload also selects the shorter HUF3 file. This does not guarantee the result is smaller than the original: incompressible or very small files can still grow because of headers.

## Install
Replace:
- `src/core/HuffmanFileCompressor.java`
- `src/server/Handlers.java`
- `tests/RoundTripTest.java`

Keep the existing `Main.java`, `WebServer.java`, `HuffmanNode.java`, `BitWriter.java`, and `BitReader.java`.

## Test
Build the application in IntelliJ (Build > Build Project), then run `tests/RoundTripTest.java`. Or from the project root after application classes are compiled:

```powershell
javac -encoding UTF-8 -cp out -d out tests\RoundTripTest.java
java -cp out RoundTripTest
```

Test output includes actual input/output byte sizes and percentage saved for each successful round trip.

## Run
Use the existing `run.bat`, or run `Main` from IntelliJ and open `http://localhost:8080`.

## DSA viva
- Huffman: greedy algorithm, min-priority queue, binary tree, prefix-free codes, bit packing.
- DEFLATE: combines LZ77-style repeated-sequence references with Huffman coding.
- The codec byte in HUF3 tells the decoder which algorithm to use.
