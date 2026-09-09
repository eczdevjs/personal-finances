import knex from 'knex';
import config from '../knexfile'; // Verifique o caminho correto do knexfile

const environment = process.env.NODE_ENV || 'development';

// Busca a configuração do ambiente atual ou faz fallback para 'development'
const knexConfig = config[environment] || config.development;

const db = knex(knexConfig);

export default db;