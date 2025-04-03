"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import { usePathname } from "next/navigation";
import { v4 } from "uuid";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { useConversationStore } from "@/stores/useConversationStore";
import { cn, samples } from "@/lib/utils";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Download } from "lucide-react";

export default function ChatInterface() {
	const {
		conversations,
		setConversations,
		setActiveConversation,
		activeConversation
	} = useConversationStore();

	const { calendarOpen } = useCalendarStore();
	useKeyboardShortcuts();

	const [messages, setMessages] = useState<
		{ text: string; isUser: boolean }[] | null
	>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const messageRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();

	// auto focus on message input
	useEffect(() => {
		messageRef.current?.focus();
	}, []);

	// reset messages when navigating to home
	useEffect(() => {
		if (pathname === "/" && messages && messages.length > 0) {
			setMessages([]);
		}
	}, [pathname]);

	useEffect(() => {
		setMessages(activeConversation?.messages || []);
		setActiveConversation(activeConversation);
	}, [activeConversation, setActiveConversation]);

	const handleExportChat = () => {
		if (!activeConversation || !messages || messages.length === 0) return;
		const lines: string[] = [`# ${activeConversation.title}\n`];
		for (const msg of messages) {
			const role = msg.isUser ? "**You**" : "**DragonGPT**";
			lines.push(`${role}\n\n${msg.text}\n`);
		}
		const blob = new Blob([lines.join("\n---\n\n")], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${activeConversation.title.replace(/\s+/g, "-")}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleSendMessage = async (message: string) => {
		let firstMessage = false;
		setIsStreaming(true);
		const pastConversations = [...conversations]; // duplicate the array to avoid state mutation
		let updatedConversation = activeConversation;

		if (!updatedConversation) {
			firstMessage = true;
			const uuid = v4();

			// Create new active conversation
			updatedConversation = {
				id: uuid,
				title: `Conversation ${pastConversations.length + 1}`,
				messages: [{ text: message, isUser: true, timestamp: Date.now() }, { text: "", isUser: false, timestamp: Date.now() }],
			};

			// Update active conversation and set it
			setActiveConversation(updatedConversation);
			setConversations([...pastConversations, updatedConversation]);
			window.history.pushState(null, "", `/chat/${uuid}`);
		} else if(updatedConversation) {
			updatedConversation = {
				...updatedConversation,
				messages: [...updatedConversation.messages, { text: message, isUser: true, timestamp: Date.now() }, { text: "", isUser: false, timestamp: Date.now() }],
			};
			const updatedConversations = pastConversations.map((c) =>
				c.id === updatedConversation!.id ? updatedConversation! : c // convo will always be defined here, ! added to avoid typescript's annoying complaining
			);
			setConversations(updatedConversations);
			setActiveConversation(updatedConversation);
		}



		try {
			const response = await fetch(process.env.NEXT_PUBLIC_API_URL + "/query", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					priorConversation: activeConversation?.messages.map(
						(messageObject) => {
							return {
								text: messageObject.text,
								isUser: messageObject.isUser,
							};
						}
					),
					query: message,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to send message, status: " + response.status);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error("Failed to get response body reader");

			let accumulatedChunks = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = new TextDecoder().decode(value);
				accumulatedChunks += chunk;

				const updateMessages = (chunks: string) => {
					updatedConversation = {
						...updatedConversation!,
						messages: updatedConversation!.messages.map((msg, index) =>
							index === updatedConversation!.messages.length - 1
								? { ...msg, text: chunks }
								: msg
						),
					}
				};

				updateMessages(accumulatedChunks);
				setActiveConversation(updatedConversation);
			}

			//Update conversation
			updatedConversation = {
				...updatedConversation,
				messages: updatedConversation!.messages.map((msg, index) =>
					index === updatedConversation!.messages.length - 1
						? { ...msg, text: accumulatedChunks }
						: msg
				),
			};
			setActiveConversation(updatedConversation);

			const conversationExists = pastConversations.some(
				(c) => c.id === updatedConversation!.id
			);
			const updatedConversations = conversationExists
				? pastConversations.map((c) => (c.id === updatedConversation!.id ? updatedConversation! : c)) // Update existing
				: [...pastConversations, updatedConversation!]; // Append new conversation if it doesn't exist

			setConversations(updatedConversations);

			if (firstMessage) {
				fetch(process.env.NEXT_PUBLIC_API_URL + "/summarize-convo", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						message
					}),
				}).then(async data => {
					const newName = (await data.json()).messageSummary;
					updatedConversation!.title = newName;
					setConversations(updatedConversations);
					setActiveConversation(updatedConversation);
				}).catch(err => {
					console.error(err);
				});
			}
		} catch (error: unknown) {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (error instanceof Error) {
				console.error("Error fetching bot response:", error.message);
				const errorText = `I'm sorry, I couldn't process your request at this moment.\nPlease contact the developers with this error message: ${error.message} for question "${message}" `;

				updatedConversation = {
					...updatedConversation,
					messages: updatedConversation!.messages.map((msg, index) =>
						index === updatedConversation!.messages.length - 1
							? { ...msg, text: errorText }
							: msg
					),
				};
				setActiveConversation(updatedConversation);

				const conversationExists = pastConversations.some(
					(c) => c.id === updatedConversation!.id
				);
				const updatedConversations = conversationExists
					? pastConversations.map((c) => (c.id === updatedConversation!.id ? updatedConversation! : c)) // Update existing
					: [...pastConversations, updatedConversation!]; // Append new conversation if it doesn't exist

				setConversations(updatedConversations);

				setMessages((prev) => {
					const newMessages = [...prev!];
					const botMessage = newMessages[newMessages.length - 1];
					if(botMessage) {
						botMessage.text = errorText;
					} else {
						newMessages.push({ text: errorText, isUser: false });
					}
					return newMessages;
				});
			}
		} finally {
			setIsStreaming(false);
		}
	};

	return (
		<div className="flex flex-col h-[calc(100dvh-5rem)] sm:h-[calc(100vh-10rem)] supports-[dvh]:h-[calc(100dvh-10rem)] w-full min-w-64 flex-1 items-center">
			{messages && messages.length > 0 && (
				<div className={cn(
					"mt-4 flex-grow overflow-auto w-full relative",
					!calendarOpen && "xl:px-20"
					)}>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleExportChat}
						className="absolute top-0 right-2 z-10 text-muted-foreground hover:text-foreground"
						title="Export chat as markdown"
						aria-label="Export chat as markdown"
					>
						<Download className="h-4 w-4" />
					</Button>
					<ChatMessages messages={messages} isStreaming={isStreaming} />
				</div>
			)}
			{messages && messages.length === 0 && (
				<>
	
					<h1 className="text-3xl md:text-4xl font-bold mt-20 md:mb-10 text-center w-72 md:w-1/2 flex-1">
						What would you like to know more about?
					</h1>
					<div className={cn("overflow-auto flex justify-end flex-col h-full w-full",
						calendarOpen ? "items-start" : "lg:items-center"
					)}>
						<div className="flex flex-col md:items-center overflow-auto no-scrollbar mb-2">
							{samples.know.map((arr, index) => (
								<div key={index} className="flex flex-row">
									{arr.map((message, i) => (
										<Button
											key={i}
											variant="ghost"
											onClick={() => handleSendMessage("Tell me about " + message)}
											className="p-1 px-2 lg:px-3 m-2 max-w-80 h-fit  text-base font-light rounded-full bg-gray-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-left"
										>
											{message}
										</Button>
									))}
								</div>
							))}
						</div>
					</div>
				</>
			)}
			{!messages && (
				<div className="flex flex-grow justify-center">
					<Spinner className="" />
				</div>
			)}
			<ChatInput
				onSendMessage={handleSendMessage}
				isStreaming={isStreaming}
				messageRef={messageRef}
			/>
		</div>
	);
}
