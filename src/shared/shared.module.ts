import { Module, Global } from '@nestjs/common';
import { ConfigService } from './services/config.service';
// import { AuthModule } from '../modules/auth/auth.module';
const providers = [ConfigService];

@Global()
@Module({
    imports: [],
    providers: [...providers],
    exports: [...providers],
})
export class SharedModule {}
