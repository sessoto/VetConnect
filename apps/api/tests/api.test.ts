import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// These tests assume a real Postgres database is available via DATABASE_URL.
// Run with: pnpm db:migrate && pnpm test
// They are skipped automatically if DATABASE_URL is not set.

const hasDb = Boolean(process.env.DATABASE_URL);

(hasDb ? describe : describe.skip)('VetConnect API', () => {
  let app: import('express').Express;
  let prisma: import('@prisma/client').PrismaClient;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-please-change-please';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-please-change-please';
    const { createApp } = await import('../src/app.js');
    const { prisma: p } = await import('../src/prisma.js');
    app = createApp();
    prisma = p;
    // Clean
    await prisma.auditLog.deleteMany();
    await prisma.note.deleteMany();
    await prisma.careTask.deleteMany();
    await prisma.triageEntry.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.clinic.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function registerClinic(suffix: string) {
    const res = await request(app)
      .post('/auth/register-clinic')
      .send({
        clinicName: `Clinic ${suffix}`,
        adminName: `Admin ${suffix}`,
        email: `admin+${suffix}@test.vet`,
        password: 'Password1234',
      });
    expect(res.status).toBe(201);
    return { token: res.body.accessToken as string, user: res.body.user };
  }

  it('register-clinic + login + me', async () => {
    const { token } = await registerClinic('a');
    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('admin');

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'admin+a@test.vet', password: 'Password1234' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
  });

  it('multi-tenant isolation: clinic A cannot see clinic B patients', async () => {
    const a = await registerClinic('iso-a');
    const b = await registerClinic('iso-b');
    const create = await request(app)
      .post('/patients')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        name: 'Firulais',
        species: 'perro',
        ownerName: 'Juan',
        ownerContact: '+56 9 1111 1111',
        reasonForVisit: 'atropello',
      });
    expect(create.status).toBe(201);
    const pid = create.body.id;

    const list = await request(app).get('/patients').set('Authorization', `Bearer ${b.token}`);
    expect(list.status).toBe(200);
    expect(list.body.find((p: { id: string }) => p.id === pid)).toBeUndefined();

    const detail = await request(app)
      .get(`/patients/${pid}`)
      .set('Authorization', `Bearer ${b.token}`);
    expect(detail.status).toBe(404);
  });

  it('triage flow + care task complete creates next recurrence + audit log', async () => {
    const a = await registerClinic('flow');
    const p = await request(app)
      .post('/patients')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        name: 'Luna',
        species: 'gato',
        ownerName: 'Ana',
        ownerContact: 'a@x.cl',
        reasonForVisit: 'dolor de estómago',
      });
    const pid = p.body.id;

    const t = await request(app)
      .post(`/patients/${pid}/triage`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ level: 'red', reason: 'compromiso vital' });
    expect(t.status).toBe(201);

    const list = await request(app)
      .get('/patients?triage=red')
      .set('Authorization', `Bearer ${a.token}`);
    expect(list.body.length).toBe(1);
    expect(list.body[0].currentTriage.level).toBe('red');

    const ct = await request(app)
      .post('/care-tasks')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        patientId: pid,
        type: 'feeding',
        title: 'Ración húmeda',
        dosage: '100g',
        scheduledAt: new Date().toISOString(),
        recurrence: 'every_n_hours',
        recurrenceN: 8,
      });
    expect(ct.status).toBe(201);

    const done = await request(app)
      .post(`/care-tasks/${ct.body.id}/complete`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ completionNotes: 'aceptó comida' });
    expect(done.status).toBe(200);
    expect(done.body.task.status).toBe('done');
    expect(done.body.nextTask).toBeTruthy();

    const history = await request(app)
      .get(`/patients/${pid}/care-history?type=feeding`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(history.status).toBe(200);
    expect(history.body.length).toBe(1);
    expect(history.body[0].completionNotes).toBe('aceptó comida');

    const audit = await request(app).get('/audit').set('Authorization', `Bearer ${a.token}`);
    expect(audit.status).toBe(200);
    const actions = audit.body.map((l: { action: string; entity: string }) => `${l.entity}.${l.action}`);
    expect(actions).toContain('care_task.complete');
    expect(actions).toContain('triage.create');
    expect(actions).toContain('patient.create');
  });

  it('rejects without token', async () => {
    const res = await request(app).get('/patients');
    expect(res.status).toBe(401);
  });

  it('non-admin cannot read audit', async () => {
    const a = await registerClinic('audit-deny');
    // Create a vet user
    await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        name: 'Vet One',
        email: 'vet+ad@test.vet',
        password: 'Password1234',
        role: 'vet',
      });
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'vet+ad@test.vet', password: 'Password1234' });
    const vetToken = login.body.accessToken;
    const res = await request(app).get('/audit').set('Authorization', `Bearer ${vetToken}`);
    expect(res.status).toBe(403);
  });
});
