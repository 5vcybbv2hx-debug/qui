/**
 * useReservationLifecycle.js
 * Runs automatic lifecycle processing when the reservations list is loaded.
 *
 * Behaviour:
 *  - Runs once when data first loads (not on every re-render)
 *  - Archives past one-off reservations
 *  - For recurring: archives past record, creates next future occurrence
 *  - All operations are idempotent — safe to run multiple times
 *  - Never creates duplicates (checked before every create)
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
    findReservationsNeedingProcessing,
    decideLLifecycleAction,
} from '../utils/lifecycleUtils';
import { RES_KEYS } from './useReservations';

/**
 * @param {object[]} allReservations - full list from the query cache
 */
export function useReservationLifecycle(allReservations) {
    const qc          = useQueryClient();
    const processedRef = useRef(false); // Run only once per page load

    useEffect(() => {
        // Wait until data is loaded, then run exactly once
        if (!allReservations?.length || processedRef.current) return;

        const toProcess = findReservationsNeedingProcessing(allReservations);
        if (toProcess.length === 0) {
            processedRef.current = true;
            return;
        }

        processedRef.current = true;

        (async () => {
            for (const res of toProcess) {
                const decision = decideLLifecycleAction(res, allReservations);

                if (decision.action === 'archive' || decision.action === 'archive_series') {
                    // Simply mark as archived — no new record needed
                    await base44.entities.Reservation.update(res.id, { is_archived: true });

                } else if (decision.action === 'advance') {
                    // 1. Create the next occurrence FIRST (so data is never lost)
                    await base44.entities.Reservation.create({
                        customer_name:       res.customer_name,
                        phone:               res.phone,
                        email:               res.email,
                        date:                decision.nextDate,
                        time:                res.time,
                        guests:              res.guests,
                        table:               res.table,
                        notes:               res.notes,
                        status:              'vorgemerkt', // reset to pending for new occurrence
                        is_recurring:        true,
                        recurring_pattern:   res.recurring_pattern,
                        recurring_end_date:  res.recurring_end_date,
                        recurring_series_id: res.recurring_series_id,
                        source:              res.source ?? 'intern',
                    });

                    // 2. Archive the past record (preserve history)
                    await base44.entities.Reservation.update(res.id, { is_archived: true });
                }
            }

            // Refresh the query cache after all updates
            qc.invalidateQueries({ queryKey: RES_KEYS.all });
        })();
    }, [allReservations]);
}