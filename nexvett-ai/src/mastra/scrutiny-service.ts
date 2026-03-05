import { logger } from './lib/logger';
import { AnyObjectSchema } from 'yup';

/**
 * World-Class Security: Bidirectional Scrutiny Service
 * 
 * This service implements the "Zero-Trust Contract" pattern:
 * 1. Inbound Scrutiny: Strict validation of request bodies (Inputs).
 * 2. Outbound Scrutiny (The Sieve): Strict filtering of responses (Outputs).
 * 
 * Benefit: Even if internal code adds a sensitive field (paths, secrets) to a response, 
 * the Sieve will strip it before it leaves the server.
 */
export class ScrutinyService {
    /**
     * Scrutinize Inbound Data
     * Validates and casts input against a schema.
     */
    static validateInput<T>(schema: AnyObjectSchema, data: unknown): T {
        try {
            return schema.validateSync(data, {
                abortEarly: false,
                stripUnknown: true, // Remove anything not in schema
            }) as T;
        } catch (error) {
            logger.warn('INBOUND_SCRUTINY_FAIL:', { error, data });
            throw error;
        }
    }

    /**
     * Scrutinize Outbound Data (The Sieve)
     * Filters response data against a contract schema to prevent leakage.
     */
    static secureOutput<T>(schema: AnyObjectSchema, data: unknown): T {
        try {
            // We use cast() which effectively "sieves" the data through the schema definition.
            // stripUnknown ensures only fields defined in the schema survive.
            const secured = schema.cast(data, {
                stripUnknown: true,
            }) as T;

            // Audit check for leakage (Compare keys to see if we dropped anything sensitive)
            if (process.env.NODE_ENV !== 'production' && data && typeof data === 'object') {
                const originalKeys = Object.keys(data as object);
                const securedKeys = Object.keys(secured as object);
                const droppedKeys = originalKeys.filter(k => !securedKeys.includes(k));

                if (droppedKeys.length > 0) {
                    logger.debug('OUTBOUND_SCRUTINY_SIEVED:', {
                        count: droppedKeys.length,
                        droppedFields: droppedKeys
                    });
                }
            }

            return secured;
        } catch (error: any) {
            logger.error('OUTBOUND_SCRUTINY_EXCEPTION:', {
                message: error.message,
                name: error.name,
                errors: error.errors, // For Yup validation errors
                value: error.value,   // The value that failed
            });
            // In case of cast failure, returning an empty version of the type/schema is safest
            return schema.getDefault() as T;
        }
    }
}
