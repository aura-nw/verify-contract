export enum AppConstants {}

export enum DATABASE_TYPE {
    POSTGRES = 'postgres',
    MYSQL = 'mysql',
}

export enum LCD_QUERY {
    GET_DATA_CODE_ID = '/cosmwasm/wasm/v1/code/',
}

export enum SCHEMA_FILE {
    INSTANTIATE = 'instantiate_msg.json',
    QUERY = 'query_msg.json',
    QUERY_FOR_EMPTY = 'query_msg_for__empty.json',
    QUERY_CW2981 = 'query_msg_for__cw2981_query_msg.json',
    EXECUTE = 'execute_msg.json',
    CW20_EXECUTE = 'cw20_execute_msg.json',
}

export enum VERIFICATION_STATUS {
    FAIL = 'FAIL',
    VERIFYING = 'VERIFYING',
    SUCCESS = 'SUCCESS',
}

export enum UPLOAD_STATUS {
    UNVERIFIED = 'Unverified',
    NOT_REGISTERED = 'Not registered',
    TBD = 'TBD',
    DEPLOYED = 'Deployed',
    REJECTED = 'Rejected',
}

export enum VERIFY_CODE_RESULT {
    FAIL = 'Fail',
    IN_PROGRESS = 'In-progress',
    SUCCESS = 'Success',
    PENDING = 'Pending',
}

export enum VERIFY_STEP_CHECK_ID {
    CODE_ID_VALID = 1,
    COMPILER_IMAGE_FORMAT = 2,
    CODE_ID_SESSION_VALID = 3,
    GET_DATA_HASH = 4,
    GET_SOURCE_CODE = 5,
    COMPILE_SOURCE_CODE = 6,
    COMPARE_DATA_HASH = 7,
    INTERNAL_PROCESS = 8,
}
