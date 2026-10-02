import { ArrayUnique, IsArray, IsIn, IsString } from 'class-validator';
import { SHAREABLE_WARDROBE_CATEGORIES } from '../../domain';

export class UpdateWardrobeSharingDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn([...SHAREABLE_WARDROBE_CATEGORIES], { each: true })
  sharedCategories!: string[];
}
