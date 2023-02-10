export const ErrorMap = {
    // Success Code
    SUCCESSFUL: {
        Code: 'SUCCESSFUL',
        Message: 'Successfully!',
    },
    CORRECT_COMPILER_IMAGE: {
        Code: 'S001',
        Message: 'Correct compiler image.',
    },
    CODE_ID_VALID: {
        Code: 'S002',
        Message: 'Code ID valid.',
    },
    CODE_ID_SESSION_VALID: {
        Code: 'S003',
        Message: 'Code ID session valid.',
    },
    GET_DATA_HASH_SUCCESSFUL: {
        Code: 'S004',
        Message: 'Get data hash successful.',
    },
    GET_SOURCE_CODE_SUCCESSFUL: {
        Code: 'S005',
        Message: 'Get source code successful.',
    },
    COMPILE_SOURCE_CODE_SUCCESSFUL: {
        Code: 'S006',
        Message: 'Source code compiled successful.',
    },
    DATA_HASH_MATCH: {
        Code: 'S007',
        Message: 'Data hash match..',
    },
    VERIFY_SUCCESSFUL: {
        Code: 'S008',
        Message: 'Verify Code ID successful.',
    },

    // Error Code
    WRONG_COMPILER_IMAGE: {
        Code: 'E001',
        Message: 'Wrong compiler image.',
    },
    CODE_ID_NOT_FOUND: {
        Code: 'E002',
        Message: 'Code ID not found.',
    },
    CODE_ID_BEING_VERIFIED: {
        Code: 'E003',
        Message: 'Code ID is currently being verified.',
    },
    GET_DATA_HASH_FAIL: {
        Code: 'E004',
        Message: 'Cannot get data hash of Code ID.',
    },
    GET_SOURCE_CODE_FAIL: {
        Code: 'E005A',
        Message:
            'Cannot find github repository of this contract. Maybe your project is Private.',
    },
    COMMIT_NOT_FOUND: {
        Code: 'E005B',
        Message: 'Commit not found.',
    },
    MISSING_CARGO_LOCK: {
        Code: 'E005C',
        Message: 'Source code is missing Cargo.lock file.',
    },
    COMPILE_SOURCE_CODE_FAIL: {
        Code: 'E006',
        Message: 'Smart contract source code or compiler version is incorrect.',
    },
    WRONG_WASM_FILE: {
        Code: 'E007A',
        Message: 'Incorrect wasm file.',
    },
    DATA_HASH_MISMATCH: {
        Code: 'E007B',
        Message: 'Data hash mismatch.',
    },
    INTERNAL_ERROR: {
        Code: 'E008',
        Message: 'Internal server error.',
    },
    ZIP_FAIL: {
        Code: 'E009',
        Message: 'Error zip contract source code.',
    },
    CODE_ID_ALREADY_VERIFIED: {
        Code: 'E010',
        Message: 'Code ID already verified.',
    },
    UPDATE_ENTITY_FAIL: {
        Code: 'E011',
        Message: 'Update contract entity failed.',
    },
    E400: {
        Code: 'E400',
        Message: `Bad request`,
    },
    E403: {
        Code: 'E401',
        Message: `Unauthorized`,
    },
    E500: {
        Code: 'E500',
        Message: `Server error`,
    },
};
