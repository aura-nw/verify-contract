import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
import { camelCase } from 'typeorm/util/StringUtils';

export class PascalCaseStrategy
    extends DefaultNamingStrategy
    implements NamingStrategyInterface
{
    tableName(className: string, customName: string): string {
        return customName ? customName : camelCase(className, true);
    }

    columnName(
        propertyName: string,
        customName: string,
        embeddedPrefixes: string[],
    ): string {
        return (
            camelCase(embeddedPrefixes.join(''), true) +
            (customName ? customName : camelCase(propertyName, true))
        );
    }

    relationName(propertyName: string): string {
        return camelCase(propertyName, true);
    }

    joinColumnName(relationName: string, referencedColumnName: string): string {
        return camelCase(relationName + referencedColumnName, true);
    }

    joinTableName(
        firstTableName: string,
        secondTableName: string,
        firstPropertyName: string,
        _secondPropertyName: string,
    ): string {
        return camelCase(
            firstTableName +
                firstPropertyName.replace(/\./gi, '_') +
                secondTableName,
            true,
        );
    }

    joinTableColumnName(
        tableName: string,
        propertyName: string,
        columnName?: string,
    ): string {
        return camelCase(
            tableName + (columnName ? columnName : propertyName),
            true,
        );
    }

    classTableInheritanceParentColumnName(
        parentTableName: string,
        parentTableIdPropertyName: string,
    ): string {
        return camelCase(
            `${parentTableName}${parentTableIdPropertyName}`,
            true,
        );
    }
}
