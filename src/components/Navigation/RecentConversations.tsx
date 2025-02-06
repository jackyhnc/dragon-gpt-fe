'use client';

import { useState } from "react";
import { useConversationStore } from "@/stores/useConversationStore";
import RecentConversationItem from "./RecentConversationItem";
import ZzIcon from "../../icons/general/zz-icon";
import { Search } from "lucide-react";

const RecentConversations = ({
	small
}: {
	small?: boolean,
}) => {
	const { conversations } = useConversationStore();
	const [searchQuery, setSearchQuery] = useState("");

	const filtered = searchQuery.trim()
		? conversations.filter((c) =>
				c.title.toLowerCase().includes(searchQuery.toLowerCase())
			)
		: conversations;

	return (
		<div className="flex flex-col flex-grow overflow-auto gap-2">
			{!small && (
				<h2 className="scroll-m-20 pb-2 text-2xl font-bold tracking-wide first:mt-0">
					Recent
				</h2>
			)}
			{!small && (
				<div className="flex items-center gap-2 rounded-lg border border-border/60 bg-gray-100 dark:bg-neutral-800 px-3 py-1.5 mb-1">
					<Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
					<input
						type="text"
						placeholder="Search conversations..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						aria-label="Search conversations"
					/>
				</div>
			)}
			<div className={`${small ? 'items-center' : 'items-start'} flex flex-col items-start max-h-96`}>
				{filtered.length > 0 ? [...filtered].reverse().map((convo, index) => (
					<RecentConversationItem conversation={convo} index={index} small={small} key={convo.id} />
				)) : (
					<div className="flex flex-col gap-4 justify-center items-center w-full h-96">
						<ZzIcon className="text-muted-foreground" />
						{!small && (
							<p className="text-muted-foreground text-center text-sm">
								{searchQuery.trim()
									? "No conversations match your search"
									: "When you create a new chat, it'll show up here"}
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default RecentConversations;
