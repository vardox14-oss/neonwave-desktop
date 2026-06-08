const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const isPasswordHash = (value) => (
    typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value)
);

const hashPassword = (password) => bcrypt.hash(String(password), BCRYPT_ROUNDS);
const hashPasswordSync = (password) => bcrypt.hashSync(String(password), BCRYPT_ROUNDS);

const verifyPassword = async (password, storedPassword) => {
    if (typeof storedPassword !== 'string') return false;

    if (isPasswordHash(storedPassword)) {
        return bcrypt.compare(String(password), storedPassword);
    }

    return storedPassword === String(password);
};

module.exports = {
    hashPassword,
    hashPasswordSync,
    isPasswordHash,
    verifyPassword
};
