// 1) Exception-Stil
function parseAgeException(input) {
    const age = Number(input);

    if (!Number.isFinite(age) || age < 0) {
        throw new Error("Ungueltiges Alter");
    }

    return age;
}

try {
    const age = parseAgeException("25");
    console.log("Exception-Stil OK:", age);
} catch (err) {
    console.error("Exception-Stil FEHLER:", err.message);
}

try {
    const age = parseAgeException("-3");
    console.log("Exception-Stil OK:", age);
} catch (err) {
    console.error("Exception-Stil FEHLER:", err.message);
}

// 2) Result-Stil
function parseAgeResult(input) {
    const age = Number(input);

    if (!Number.isFinite(age) || age < 0) {
        return {
            status: "schlecht",
            data: null,
            error: "Ungueltiges Alter",
        };
    }

    return {
        status: "gut",
        data: age,
        error: null,
    };
}

const r1 = parseAgeResult("42");
if (r1.status === "gut") {
    console.log("Result-Stil OK:", r1.data);
} else {
    console.error("Result-Stil FEHLER:", r1.error);
}

const r2 = parseAgeResult("abc");
if (r2.status === "gut") {
    console.log("Result-Stil OK:", r2.data);
} else {
    console.error("Result-Stil FEHLER:", r2.error);
}
