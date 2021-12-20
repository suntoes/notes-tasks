import React, { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Spinner,
  Switch,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { MdAddTask } from 'react-icons/md';
import {
  CheckIcon,
  CloseIcon,
  DeleteIcon,
  EditIcon,
  ViewIcon,
} from '@chakra-ui/icons';
import {
  query,
  addDoc,
  arrayUnion,
  doc,
  updateDoc,
  where,
  onSnapshot,
  arrayRemove,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import id from 'date-fns/esm/locale/id/index.js';

const Tasks = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cardBg = useColorModeValue('#f0f0f0', '#222838');
  const [user, authLoading, authErrors] = useAuthState(auth);
  const [showCompleted, setShowCompleted] = useState(true);
  const [tasks, setTasks] = useState(null);
  const [task, setTask] = useState({
    id: '',
    description: '',
    dueDate: '',
    notes: '',
    completed: false,
  });
  const [editMode, setEditMode] = useState(false);
  const editClickHandler = (currentTask) => {
    setEditMode(true);
    setTask(currentTask);
    onOpen();
  };
  const closeModal = () => {
    setEditMode(false);
    onClose();
  };

  const addNewTask = async () => {
    const newId = nanoid();
    await updateDoc(doc(db, 'users', user.uid), {
      tasks: arrayUnion({ ...task, id: newId }),
    });
    onClose();
  };

  const updateTaskStatus = async (e, taskId) => {
    const currentTasks = tasks;
    currentTasks.find((item) => item.id == taskId).completed = e.target.checked;
    await updateDoc(doc(db, 'users', user.uid), {
      tasks: currentTasks,
    });
  };

  const updateTask = async (taskId) => {
    const currentTasks = tasks;
    const taskIndex = currentTasks.findIndex((item) => item.id == taskId);
    const updatedTask = {
      id: taskId,
      description: task.description,
      dueDate: task.dueDate,
      notes: task.notes,
    };
    currentTasks[taskIndex] = updatedTask;
    await updateDoc(doc(db, 'users', user.uid), {
      tasks: currentTasks,
    });
    closeModal();
  };

  const saveTask = () => {
    if (!editMode) {
      addNewTask();
    } else {
      updateTask(task.id);
    }
  };

  const deleteTaskHandler = async (task) => {
    updateDoc(doc(db, 'users', user.uid), {
      tasks: arrayRemove(task),
    });
  };

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/');
      return;
    }
    if (!user && authLoading) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      const tasksList = doc.data().tasks;
      showCompleted
        ? setTasks(tasksList)
        : setTasks(
            tasksList.filter((task) => {
              if (task.completed === false) {
                return task;
              }
            })
          );
    });
    return () => {
      unsub();
    };
  }, [user, showCompleted, authLoading]);

  if (!user && authLoading)
    return (
      <Flex w="100%" align="center" justify="center" mt="3">
        <Spinner size="lg" />
      </Flex>
    );

  return (
    <>
      <Box pos="relative" textAlign="center">
        {/* <Heading as="h2">Tasks</Heading> */}
        <Flex align="center" justify="space-around" p="3">
          <Button
            size="md"
            variant="ghost"
            p="2"
            marginInline="2"
            fontFamily="Inter"
            leftIcon={<MdAddTask size="25" />}
            onClick={() => {
              setEditMode(false);
              onOpen();
            }}
          >
            New Task
          </Button>
          <Flex align="center" ml="3">
            <Text fontSize="1rem" mb="0" mr="2">
              Toggle Completed
            </Text>
            <Switch
              isChecked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              id="show-completed"
            />
          </Flex>
        </Flex>

        <VStack>
          {!tasks && (
            <Flex mt="3" align="center" justify="center">
              <Spinner />
            </Flex>
          )}
          {tasks &&
            tasks.map((task) => (
              <Box
                key={task.id}
                flex="1"
                width="100%"
                p="2"
                bg={cardBg}
                borderRadius={6}
              >
                <Flex flexFlow="column">
                  <Checkbox
                    id={task.id}
                    onChange={(e) => updateTaskStatus(e, task.id)}
                    spacing="1rem"
                    ml="3"
                    size="lg"
                    flex="1"
                    isChecked={task.completed}
                  >
                    {task.description}
                  </Checkbox>
                  <Flex mt="3" ml={'1'} mb="1">
                    <IconButton
                      onClick={() => editClickHandler(task)}
                      mr="1"
                      variant="ghost"
                      icon={<EditIcon />}
                    />
                    <IconButton
                      variant="ghost"
                      icon={<DeleteIcon />}
                      onClick={() => deleteTaskHandler(task)}
                    />
                    {task.dueDate && (
                      <Flex ml={'1'} align="center" w="9rem">
                        <Text fontWeight="bold" color="blue.300">
                          Due:
                        </Text>
                        <Text pl="2">{task.dueDate}</Text>
                      </Flex>
                    )}
                  </Flex>
                </Flex>
              </Box>
            ))}
        </VStack>
      </Box>
      <Modal isOpen={isOpen} onClose={closeModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign="center">
            {editMode ? 'Edit' : 'New'} Task
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb="2" ml="2" mr="2">
              <FormLabel>Description:</FormLabel>
              <Input
                value={task.description}
                onChange={(e) =>
                  setTask({ ...task, description: e.target.value })
                }
                type="text"
              />
            </FormControl>
            <FormControl m="2">
              <FormLabel>Due Date:</FormLabel>
              <Input
                value={task.dueDate}
                onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
                type="date"
              />
            </FormControl>
            <FormControl m="2">
              <FormLabel>Notes:</FormLabel>
              <Textarea
                value={task.notes}
                onChange={(e) => setTask({ ...task, notes: e.target.value })}
                resize="none"
              ></Textarea>
            </FormControl>
          </ModalBody>
          <ModalFooter d="flex" alignItems="center" justifyContent="center">
            <Button
              onClick={saveTask}
              leftIcon={<CheckIcon />}
              colorScheme="green"
              m="2"
            >
              Save
            </Button>
            <Button
              onClick={closeModal}
              leftIcon={<CloseIcon />}
              colorScheme="red"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Tasks;
