import { Opt, Principal, Record, Variant, Vec, blob, int, int8, nat64, text } from "azle";

export const Status = Variant({
    Active: text,
    Unactive: text,
    Completed: text,
    Defaulted: text,
    Failed: text,
    Expired: text
});

export const Response = Variant({
    Success: text,
    NotFound: text,
    Error: text,
    InvalidPayload: text,
});

export const PaymentStatus = Variant({
    PaymentFailed: text,
    PaymentCompleted: text,
    PaymentPending: text,
})


const Grade = Variant({
    A: text,
    B: text,
    C: text,
    D: text,
    E: text,
})

export const UserData = Record({
    principal: Principal,
    name: text,
    licenceId: Vec(text)
})

export const Licence = Record({
    credentialId: text,
    licence_name: text,
    licence_description: text,
    tag: Vec(text),
    publisher: text,
    grade: Grade,
    holder: nat64,
    price: nat64,
    status: Status
})

export const PaymentOrder = Record({
    orderId: text,
    product: text,
    amount: nat64,
    status: PaymentStatus,
    applicant: Principal,
    paid_at_block: Opt(nat64),
    memo: nat64
});


export const Payload = Record({
    licence_name: text,
    licence_description: text,
    tag: Vec(text),
    grade: Grade,
    price: nat64
})

export const OnLicencePayload = Record({
    keyword: text,
    start: int8,
    length: int8,
    tag: Vec(text)
})