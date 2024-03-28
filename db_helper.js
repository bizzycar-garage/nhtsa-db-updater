import mssql from "mssql";

export async function getMsSqlPool(environment) {
  try {
    const {
      user, password, database, connectionTimeoutMillis, host, port,
    } = environment.mssql;

    const sqlConfig = {
      user,
      password,
      database,
      server: host,
      port,
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: connectionTimeoutMillis,
      },
      options: {
        encrypt: false, // for azure
        trustServerCertificate: true, // change to true for local dev / self-signed certs
      },
    };

    const msSqlPool = await mssql.connect(sqlConfig);
    return msSqlPool;
  } catch (error) {
    console.log(`UNABLE TO OPEN POOL: ${error.toString()}`)
  }
  return false;
}
export async function restoreDatabase(pool, fileName) {
  try {
    const result = await pool.request()
      .query(`
    exec msdb.dbo.rds_restore_database
    @restore_db_name='nhtsa',
    @s3_arn_to_restore_from='arn:aws:s3:::nhtsa-db-backups/${fileName}',
    @with_norecovery=0,
    @type='FULL';
    `);

    return result;
  } catch (err) {
    console.error(err);
  }
}

export async function dropDatabase(pool) {
  try {
    const result = await pool.request()
      .query(`exec msdb.dbo.rds_drop_database  N'nhtsa'`);
    console.log(result);
  } catch (err) {
    console.error(err);
  }
}