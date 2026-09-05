// Pruebas de los middlewares de autenticacion y autorizacion.
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../../src/middleware/auth');
const { jwtSecret } = require('../../src/config/auth');

// Dobles minimos de req y res, suficientes para lo que usan los middlewares.
function crearRespuesta() {
  return {
    codigo: null,
    cuerpo: null,
    status(codigo) {
      this.codigo = codigo;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
}

function firmar(carga, opciones = {}) {
  return jwt.sign(carga, jwtSecret, { expiresIn: '1h', ...opciones });
}

describe('authenticate', () => {
  let res;
  beforeEach(() => {
    res = crearRespuesta();
  });

  test('acepta un token valido y expone el usuario', () => {
    const req = { headers: { authorization: `Bearer ${firmar({ sub: 7, rol: 'docente' })}` } };
    let siguiente = false;
    authenticate(req, res, () => { siguiente = true; });

    assert.ok(siguiente, 'deberia continuar');
    assert.deepEqual(req.user, { id: 7, rol: 'docente' });
  });

  test('rechaza cuando falta la cabecera', () => {
    authenticate({ headers: {} }, res, () => assert.fail('no deberia continuar'));
    assert.equal(res.codigo, 401);
  });

  test('rechaza un esquema que no sea Bearer', () => {
    const req = { headers: { authorization: `Basic ${firmar({ sub: 1, rol: 'admin' })}` } };
    authenticate(req, res, () => assert.fail('no deberia continuar'));
    assert.equal(res.codigo, 401);
  });

  test('rechaza un token manipulado', () => {
    const req = { headers: { authorization: `Bearer ${firmar({ sub: 1, rol: 'administrador' })}xx` } };
    authenticate(req, res, () => assert.fail('no deberia continuar'));
    assert.equal(res.codigo, 401);
    assert.equal(res.cuerpo.mensaje, 'Token invalido');
  });

  test('distingue el token vencido, para que el frontend pueda reaccionar', () => {
    const vencido = jwt.sign({ sub: 1, rol: 'docente' }, jwtSecret, { expiresIn: '-1s' });
    authenticate({ headers: { authorization: `Bearer ${vencido}` } }, res, () => assert.fail());
    assert.equal(res.codigo, 401);
    assert.equal(res.cuerpo.mensaje, 'El token ha expirado');
  });

  test('rechaza un token firmado con otra clave', () => {
    const ajeno = jwt.sign({ sub: 1, rol: 'administrador' }, 'otra-clave-distinta');
    authenticate({ headers: { authorization: `Bearer ${ajeno}` } }, res, () => assert.fail());
    assert.equal(res.codigo, 401);
  });
});

describe('authorize', () => {
  let res;
  beforeEach(() => {
    res = crearRespuesta();
  });

  test('deja pasar al rol permitido', () => {
    let siguiente = false;
    authorize('administrador', 'docente')({ user: { id: 1, rol: 'docente' } }, res, () => { siguiente = true; });
    assert.ok(siguiente);
  });

  test('bloquea a un rol no listado', () => {
    authorize('administrador')({ user: { id: 1, rol: 'estudiante' } }, res, () => assert.fail());
    assert.equal(res.codigo, 403);
  });

  test('responde 401 si no hubo autenticacion previa', () => {
    authorize('administrador')({}, res, () => assert.fail());
    assert.equal(res.codigo, 401);
  });
});
