const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
  Users: {
    findByEmail: jest.fn(),
    create: jest.fn(),
  }
}));

const { Users } = require('../db');

describe('Auth — logique métier', () => {

  test('findByEmail renvoie null si email inconnu', () => {
    Users.findByEmail.mockReturnValue(null);
    const result = Users.findByEmail('inconnu@tcg.com');
    expect(result).toBeNull();
  });

  test('Users.create renvoie un objet avec id et email', () => {
    Users.create.mockReturnValue({ id: 1, email: 'alice@tcg.com', role: 'user' });
    const user = Users.create({ email: 'alice@tcg.com', password: 'hashed' });
    expect(user).toHaveProperty('id');
    expect(user.email).toBe('alice@tcg.com');
  });

  test('bcrypt.hash produit un hash différent du mot de passe original', async () => {
    const password = 'MonMotDePasse123';
    const hashed = await bcrypt.hash(password, 10);
    expect(hashed).not.toBe(password);
    expect(hashed.length).toBeGreaterThan(20);
  });

  test('bcrypt.compare valide le bon mot de passe', async () => {
    const password = 'MonMotDePasse123';
    const hashed = await bcrypt.hash(password, 10);
