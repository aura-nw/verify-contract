export const ErrorMap = {
    SUCCESSFUL: {
        Code: 'SUCCESSFUL',
        Message: 'Successfully!',
    },
    E001: {
        Code: 'E001',
        Message: 'Smart contract source code or compiler version is incorrect',
    },
    E002: {
        Code: 'E002',
        Message: 'Error zip contract source code',
    },
    E003: {
        Code: 'E003',
        Message: 'Contract not found',
    },
    E004: {
        Code: 'E004',
        Message: 'The code id is already being verified',
    },
    E005: {
        Code: 'E005',
        Message: 'Cannot get data hash of code id',
    },
    E006: {
        Code: 'E006',
        Message: 'Cannot find github repository of this contract',
    },
    E007: {
        Code: 'E007',
        Message: 'Commit not found',
    },
    E008: {
        Code: 'E008',
        Message: 'Missing Cargo.lock file',
    },
    E009: {
        Code: 'E009',
        Message: 'Wrong compiler image',
    },
    E010: {
        Code: 'E010',
        Message: 'Incorrect wasm file',
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
