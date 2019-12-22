import React, { useState, CSSProperties } from 'react';
import { useSelector } from 'react-redux';

import { IonIcon, IonLabel, IonSelectOption, IonSelect } from '@ionic/react';

import styles from './Task.module.scss';

import { checkmarkCircle } from 'ionicons/icons';

import { RootState } from '../../store/reducers';
import { rootConnector, RootProps } from '../../store/thunks/index.thunks';

import { TaskInProgress, TaskInProgressClientData, TaskInProgressData } from '../../store/interfaces/task.inprogress';

import Spinner from '../../components/spinner/Spinner';

import { contrast } from '../../utils/utils.color';
import {Settings as SettingsModel} from '../../models/settings';

const Task: React.FC<RootProps> = (props: RootProps) => {

    const [freeze, setFreeze] = useState<boolean>(false);

    const task: TaskInProgress | undefined = useSelector((state: RootState) => {
        return state.tasks.taskInProgress;
    });

    const client: TaskInProgressClientData | undefined = useSelector((state: RootState) => {
        return state.tasks.taskInProgress !== undefined && state.tasks.taskInProgress.data ? (state.tasks.taskInProgress.data as TaskInProgressData).client : undefined
    });

    const contrastColor: string = useSelector((state: RootState) => {
        const client: TaskInProgressClientData | undefined = state.tasks.taskInProgress !== undefined && state.tasks.taskInProgress.data ? (state.tasks.taskInProgress.data as TaskInProgressData).client : undefined;
        return contrast(client !== undefined ? client.color : undefined);
    });

    const settings: SettingsModel = useSelector((state: RootState) => state.settings.settings);

    async function stopTask() {
        setFreeze(true);

        await props.stopTask(1500, settings.roundTime);

        await props.computeSummary();
        await props.listTasks();
        await props.listProjectsInvoices();

        setTimeout(() => {
            setFreeze(false);
        }, 1500);
    }

    async function onRoundTimeChange($event: CustomEvent) {
        if (!$event || !$event.detail) {
            return;
        }

        if  (!task || task.data === undefined) {
            return;
        }

        if ($event.detail.value === undefined || $event.detail.value === '') {
            delete task.data['description'];
        } else {
            task.data.description = $event.detail.value;
        }

        await props.updateTask(task);
    }

    return (
        <div className={`${styles.task} ${task !== undefined ? styles.progress : ''}`} style={client !== undefined ? {background: `${client.color}`} : undefined}>
            <div>
                {
                    task !== undefined ? <Spinner freeze={freeze} color={client !== undefined ? client.color : undefined} contrast={contrastColor}></Spinner> : undefined
                }

                {renderTaskDescription()}

                <button onClick={() => stopTask()} aria-label="Stop current task" className="ion-activatable" disabled={freeze} style={{'--color': contrastColor} as CSSProperties}>
                    <IonIcon icon={checkmarkCircle} />
                </button>
            </div>
        </div>
    );

    function renderTaskDescription() {
        if (!settings || !settings.descriptions || settings.descriptions.length <= 0) {
            return undefined;
        }

        if (!task || task.data === undefined) {
            return undefined;
        }

        return <IonSelect interfaceOptions={{header: 'Description of the task'}} placeholder="Description of the task" value={task.data.description} onIonChange={($event: CustomEvent) => onRoundTimeChange($event)}>
            {
                settings.descriptions.map((description: string, i: number) => {
                    return <IonSelectOption value={description} key={`desc-${i}`}>{description}</IonSelectOption>
                })
            }
        </IonSelect>
    }

};

export default rootConnector(Task);
