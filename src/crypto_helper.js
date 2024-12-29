// AES-GCM encryption and decryption utility for React

// Function to convert a UTF-8 string to an ArrayBuffer
const utf8ToArrayBuffer = (str) => new TextEncoder().encode(str);

// Function to convert an ArrayBuffer to a Base64 string
const arrayBufferToBase64 = (buffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)));

// Function to convert a Base64 string to an ArrayBuffer
const base64ToArrayBuffer = (b64) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// Function to generate a random 96-bit nonce
const generateNonce = () => crypto.getRandomValues(new Uint8Array(12));

// AES-GCM encryption function
export async function encryptPayload(key, plaintext, associatedData = "") {
    const keyBuffer = base64ToArrayBuffer(key); // Decode key from Base64
    const encodedKey = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    const nonce = generateNonce();
    const encryptedData = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: nonce,
            additionalData: utf8ToArrayBuffer(associatedData),
        },
        encodedKey,
        utf8ToArrayBuffer(plaintext) // Convert plaintext to ArrayBuffer
    );

    return {
        c: arrayBufferToBase64(encryptedData), // Ciphertext in Base64
        n: arrayBufferToBase64(nonce),         // Nonce in Base64
        a: arrayBufferToBase64(utf8ToArrayBuffer(associatedData)), // Associated data in Base64
    };
}

// AES-GCM decryption function
export async function decryptPayload(encryptedPayload, key) {
    const keyBuffer = base64ToArrayBuffer(key); // Decode key from Base64
    const encodedKey = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const { c, n, a } = encryptedPayload;

    const decryptedData = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToArrayBuffer(n),
            additionalData: base64ToArrayBuffer(a),
        },
        encodedKey,
        base64ToArrayBuffer(c) // Ciphertext as ArrayBuffer
    );

    return new TextDecoder().decode(decryptedData); // Convert ArrayBuffer to UTF-8 string
}

// Test function to validate encryption and decryption
export async function clientEncryptAndServerDecryptTest() {
    const key = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="; // Example 32-byte key in Base64
    const plaintext = JSON.stringify({
        request_params: {
            request_type: "command_execution",
            command_params: {
                command_type: "run_bash_script",
                run_mode: "async",
                command_data: {
                    run_bash_script_data: {
                        script_data: "ZWNobyAnSGVsbG8sIFdvcmxkIScK",
                        script_data_type: "bash_script_b64_utf8",
                    },
                },
                command_progress_info_params: {
                    stream_progress_type: "realtime",
                },
            },
        },
    });

    console.log("Original Plaintext:", plaintext);

    // Encrypt the payload
    const encryptedPayload = await encryptPayload(key, plaintext);
    console.log("Encrypted Payload:", encryptedPayload);

    // Decrypt the payload
    const decryptedPayload = await decryptPayload(encryptedPayload, key);
    console.log("Decrypted Payload:", decryptedPayload);

    if (decryptedPayload === plaintext) {
        console.log("Test Passed: Encryption and Decryption are consistent.");
    } else {
        console.error("Test Failed: Mismatch between original and decrypted data.");
    }
}
