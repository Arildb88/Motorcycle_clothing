import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { SearchResortsQueryDto } from './dto/resort-query.dto';

describe('SearchResortsQueryDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  });
  const query = (metatype: new () => object): ArgumentMetadata => ({
    type: 'query',
    metatype,
    data: '',
  });

  it('accepts Norwegian letters without folding them', async () => {
    for (const q of ['Åmli', 'Øyer', 'Sæby', 'ÆØÅ', 'Kongsberg']) {
      const dto = await pipe.transform({ q }, query(SearchResortsQueryDto));
      expect(dto).toMatchObject({ q });
    }
  });
});
