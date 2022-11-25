export enum AppConstants { }

export enum DATABASE_TYPE {
    POSTGRES = 'postgres',
    MYSQL = 'mysql',
}

export enum LCD_QUERY {
    GET_DATA_CODE_ID = '/cosmwasm/wasm/v1/code/'
}

export enum REDIS_VERIFY_STATUS {
    VERIFYING = 'Verifying',
}

export enum SCHEMA_FILE {
    INSTANTIATE = 'instantiate_msg.json',
    QUERY = 'query_msg.json',
    QUERY_FOR_EMPTY = 'query_msg_for__empty.json',
    QUERY_CW2981 = 'query_msg_for__cw2981_query_msg.json',
    EXECUTE = 'execute_msg.json',
    CW20_EXECUTE = 'cw20_execute_msg.json',
}

export enum CONTRACT_VERIFICATION {
    VERIFIED = 'VERIFIED',
    UNVERIFIED = 'UNVERIFIED',
}

export enum UPLOAD_STATUS {
    UNVERIFIED = 'Unverified',
    NOT_REGISTERED = 'Not registered',
    TBD = 'TBD',
    DEPLOYED = 'Deployed',
    REJECTED = 'Rejected',
}