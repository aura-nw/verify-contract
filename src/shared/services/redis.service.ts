import { createClient, RedisClientType } from 'redis';
import Redis from 'ioredis';

export class RedisService {
    async getRedisClient(redisClient) {
        if (redisClient === undefined) {
            redisClient = createClient({
                username: process.env.REDIS_USERNAME,
                password: process.env.REDIS_PASSWORD,
                socket: {
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT, 10),
                },
                database: parseInt(process.env.REDIS_DB, 10),
            });
            console.log("REDIS connection", process.env.REDIS_USERNAME, process.env.REDIS_PASSWORD, process.env.REDIS_HOST, process.env.REDIS_DB);
            await redisClient.connect();
        }
        return <RedisClientType>redisClient;
    }

    getIoRedis(ioredis) {
        if (ioredis === undefined) {
            ioredis = new Redis({
                port: parseInt(process.env.REDIS_PORT, 10),
                host: process.env.REDIS_HOST,
                username: process.env.REDIS_USERNAME,
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB, 10),
              });
            return ioredis;
        }
        return ioredis;
    } 
}