import { Canister, Duration, Err, None, Opt, Principal, Result, Some, StableBTreeMap, Vec, bool, ic, init, nat64, query, text, update } from 'azle';
import { Licence, UserData, Response, Payload, Status, PaymentOrder, OnLicencePayload } from './types';
import { v4 as uuidv4 } from 'uuid';
import * as hashcode from 'hashcode';
const hashCode = hashcode.hashCode;

type User = typeof UserData.tsType;
type Lcns = typeof Licence.tsType;
type Ordr = typeof PaymentOrder.tsType;


const userStorage = StableBTreeMap<Principal, User>(0);
const licenceStorage = StableBTreeMap<text, Lcns>(1);
const pendingOrderStorage = StableBTreeMap<nat64, Ordr>(4);


const TIMEOUT_PERIOD = 48000n; // reservation period in seconds

export default Canister({
    createUser: update([text], Result(text, Response), (name) => {
        const userData: User = {
            principal: ic.caller(),
            name: name,
            licenceId: []
        };

        userStorage.insert(ic.caller(), userData);
        console.log('createUser userData', userData)
        return Result.Ok(`User ${name} registered successfully`);
    }),
    createLicence: update([Payload], Result(Response, Response), (payload) => {
        try {
            const user = userStorage.get(ic.caller())
            console.log('createLicence user', user);

            if ('None' in user) return Result.Err({ Error: `Please register user first` })
            const lcns: Lcns = {
                ...payload,
                credentialId: uuidv4(),
                publisher: ic.caller().toText(),
                holder: 0n,
                status: { "Defaulted": "Posted" }
            }
            licenceStorage.insert(lcns.credentialId, lcns);
            return Result.Ok({ Success: `Licence ${payload.licence_name} created successfully` })
        } catch (error) {
            return Result.Err({ Error: `Licence ${payload.licence_name} Error` })
        }
    }),
    requestLicence: update([text, nat64], Result(PaymentOrder, text), async (credential) => {
        const lsc = licenceStorage.get(credential)
        if ('None' in lsc) return Result.Err(`Licence not Found`)

        const lscn = lsc.Some

        const orderClaim: Ordr = {
            orderId: await generateSerialNumber(16),
            product: lscn.credentialId,
            amount: lscn.price,
            status: { PaymentPending: "PAYMENT_PENDING" },
            applicant: ic.caller(),
            paid_at_block: None,
            memo: await generateCorrelationId(lscn.credentialId)
        };

        pendingOrderStorage.insert(orderClaim.memo, orderClaim);
        discardByTimeout(orderClaim.memo, TIMEOUT_PERIOD);
        return Result.Ok(orderClaim);
    }),
    getLicence: query([OnLicencePayload], Result(Vec(Licence), text), (get) => {
        const lcn = licenceStorage.items(get.start, get.length)
            .filter(e => e[1].credentialId.includes(get.keyword)
                || get.tag.some(word => e[1]
                    .tag.some(ordWord => ordWord === word)))
            .map(([_, Licence]) => Licence)
        if (lcn.length === 0) {
            return Result.Err(`There's no one licence list`)
        }
        return Result.Ok(lcn)
    }),

    // getCanisterAddress: query([], text, () => {
    //     let canisterPrincipal = ic.id();
    //     return hexAddressFromPrincipal(canisterPrincipal, 0);
    // }),

    // getAddressFromPrincipal: query([Principal], text, (principal) => {
    //     return hexAddressFromPrincipal(principal, 0);
    // }),

    getLicenceOrder: query([], Vec(PaymentOrder), () => {
        return pendingOrderStorage.values();
    }),

})



function discardByTimeout(memo: nat64, delay: Duration) {
    ic.setTimer(delay, () => {
        const order = pendingOrderStorage.remove(memo);
        console.log(`Subscribe discarded ${order}`);
    });
};

function hash(input: any): nat64 {
    return BigInt(Math.abs(hashCode().value(input)));
};

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};

function generateCorrelationId(productId: text): nat64 {
    const correlationId = `${productId}_${ic.caller().toText()}_${ic.time()}`;
    return hash(correlationId);
};

async function generateSerialNumber(length: number): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + ic.time();
    console.log('characters', characters);

    let result = '';
    const charLength = characters.length;
    console.log('charLength', charLength);

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charLength));
    }
    return result;
}

